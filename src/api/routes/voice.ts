import { Router, Response } from 'express';
import multer from 'multer';
import { VoiceService } from '../services/VoiceService';
import SessionService from '../services/SessionService';
import { AnalyticsService } from '../services/AnalyticsService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { rateLimiter, voiceRateLimiter, analyticsRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import Joi from 'joi';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Validation schemas
const textToSpeechSchema = Joi.object({
  text: Joi.string().required().min(1).max(4000),
  voice: Joi.string().valid('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer').default('alloy'),
  model: Joi.string().valid('tts-1', 'tts-1-hd').default('tts-1'),
  speed: Joi.number().min(0.25).max(4.0).default(1.0),
  format: Joi.string().valid('mp3', 'opus', 'aac', 'flac').default('mp3'),
});

const speechToTextSchema = Joi.object({
  language: Joi.string().optional(),
  prompt: Joi.string().max(500).optional(),
  temperature: Joi.number().min(0).max(1).default(0),
  sessionId: Joi.string().optional(),
});

/**
 * @swagger
 * /api/voice/speech-to-text:
 *   post:
 *     summary: Convert speech to text using OpenAI Whisper
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file to transcribe
 *               language:
 *                 type: string
 *                 description: Language code (e.g., 'en', 'es', 'fr')
 *               prompt:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional text to guide the model's style
 *               temperature:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0
 *                 description: Sampling temperature
 *               sessionId:
 *                 type: string
 *                 description: Associated learning session ID
 *     responses:
 *       200:
 *         description: Speech successfully converted to text
 *       400:
 *         description: Invalid input data or audio file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/speech-to-text', 
  authenticate, 
  voiceRateLimiter,
  upload.single('audio'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required',
      });
    }

    const { error, value } = speechToTextSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    try {
      const startTime = Date.now();
      
      const result = await VoiceService.speechToText(req.file.buffer, {
        language: value.language,
        temperature: value.temperature,
      });

      const processingTime = Date.now() - startTime;

      let voiceInteractionId: string | undefined;
      if (value.sessionId) {
        const interaction = await SessionService.addInteraction({
          sessionId: value.sessionId,
          userId: req.user!.id,
          type: 'voice',
          content: result.transcript,
          metadata: {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            language: value.language,
            prompt: value.prompt,
            temperature: value.temperature,
          },
          processingTime: result.duration,
          confidenceScore: result.confidence,
        });

        const saved = await VoiceService.saveVoiceInteraction({
          interactionId: interaction.id,
          transcript: result.transcript,
          language: result.language,
          confidenceScore: result.confidence,
          processingDuration: result.duration,
        });
        voiceInteractionId = saved.id;
      }

      // Track speech-to-text usage
      AnalyticsService.trackEvent({
        userId: req.user!.id,
        sessionId: value.sessionId,
        eventType: 'voice_speech_to_text',
        eventData: {
          fileSize: req.file.size,
          duration: result.duration,
          language: result.language,
          processingTime,
          textLength: result.transcript.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      logger.info('Speech-to-text conversion completed', {
        userId: req.user!.id,
        sessionId: value.sessionId,
        fileSize: req.file.size,
        processingTime,
        textLength: result.transcript.length,
      });

      return res.json({
        success: true,
        data: {
          text: result.transcript,
          language: result.language,
          duration: result.duration,
          processingTime,
          voiceInteractionId,
        },
      });
    } catch (error) {
      logger.error('Speech-to-text conversion failed', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        fileSize: req.file.size,
      });

      // Track failed conversion
      AnalyticsService.trackEvent({
        userId: req.user!.id,
        sessionId: value.sessionId,
        eventType: 'voice_speech_to_text_failed',
        eventData: {
          fileSize: req.file.size,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to convert speech to text',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /api/voice/text-to-speech:
 *   post:
 *     summary: Convert text to speech using OpenAI TTS
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 4000
 *                 description: Text to convert to speech
 *               voice:
 *                 type: string
 *                 enum: [alloy, echo, fable, onyx, nova, shimmer]
 *                 default: alloy
 *                 description: Voice to use for synthesis
 *               model:
 *                 type: string
 *                 enum: [tts-1, tts-1-hd]
 *                 default: tts-1
 *                 description: TTS model to use
 *               speed:
 *                 type: number
 *                 minimum: 0.25
 *                 maximum: 4.0
 *                 default: 1.0
 *                 description: Speech speed
 *               format:
 *                 type: string
 *                 enum: [mp3, opus, aac, flac]
 *                 default: mp3
 *                 description: Audio format
 *     responses:
 *       200:
 *         description: Text successfully converted to speech
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/text-to-speech', 
  authenticate, 
  voiceRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = textToSpeechSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    try {
      const startTime = Date.now();
      
      const ttsResult = await VoiceService.textToSpeech(value.text, {
        voice: value.voice,
        model: value.model,
        speed: value.speed,
        responseFormat: value.format,
      });

      const processingTime = Date.now() - startTime;

      // Optionally save a voice interaction if a session is provided in future

      // Track text-to-speech usage
      AnalyticsService.trackEvent({
        userId: req.user!.id,
        eventType: 'voice_text_to_speech',
        eventData: {
          textLength: value.text.length,
          voice: value.voice,
          model: value.model,
          speed: value.speed,
          format: ttsResult.format,
          processingTime: ttsResult.duration,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      logger.info('Text-to-speech conversion completed', {
        userId: req.user!.id,
        textLength: value.text.length,
        voice: value.voice,
        processingTime,
        audioUrlLength: ttsResult.audioUrl.length,
      });

      return res.json({
        success: true,
        data: {
          audioUrl: ttsResult.audioUrl,
          format: ttsResult.format,
          duration: ttsResult.duration,
          processingTime,
        },
      });
    } catch (error) {
      logger.error('Text-to-speech conversion failed', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: value.text.length,
      });

      // Track failed conversion
      AnalyticsService.trackEvent({
        userId: req.user!.id,
        eventType: 'voice_text_to_speech_failed',
        eventData: {
        textLength: value.text.length,
        voice: value.voice,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to convert text to speech',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /api/voice/interactions:
 *   get:
 *     summary: Get user's voice interactions history
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [speech_to_text, text_to_speech]
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Voice interactions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/interactions', 
  authenticate, 
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;
    const sessionId = req.query.sessionId as string;

    const interactions = await VoiceService.getVoiceInteractions(
      req.user!.id,
      { type: (type as 'speech_to_text' | 'text_to_speech') || undefined, sessionId, limit, offset }
    );

    res.json({
      success: true,
      data: interactions,
      pagination: {
        limit,
        offset,
        total: interactions.length,
      },
    });
  })
);

/**
 * @swagger
 * /api/voice/stats:
 *   get:
 *     summary: Get user's voice usage statistics
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Voice statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', 
  authenticate, 
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timeframe = req.query.timeframe as string || 'month';
    
    if (!['day', 'week', 'month', 'year'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be day, week, month, or year.',
      });
    }

    const stats = await VoiceService.getVoiceStats(
      req.user!.id
    );

    return res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @swagger
 * /api/voice/languages:
 *   get:
 *     summary: Get supported languages for speech recognition
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supported languages retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/languages', 
  authenticate, 
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const languages = VoiceService.getSupportedLanguages();

    return res.json({
      success: true,
      data: languages,
    });
  })
);

/**
 * @swagger
 * /api/voice/voices:
 *   get:
 *     summary: Get available voices for text-to-speech
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available voices retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/voices', 
  authenticate, 
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const voices = VoiceService.getSupportedVoices();

    return res.json({
      success: true,
      data: voices,
    });
  })
);

/**
 * @swagger
 * /api/voice/validate-audio:
 *   post:
 *     summary: Validate audio file before processing
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file to validate
 *     responses:
 *       200:
 *         description: Audio file is valid
 *       400:
 *         description: Invalid audio file
 *       401:
 *         description: Unauthorized
 */
router.post('/validate-audio', 
  authenticate, 
  rateLimiter,
  upload.single('audio'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required',
      });
    }

    try {
      // validateAudioInput throws on invalid input; no return value on success
      VoiceService.validateAudioInput(req.file.buffer, 25 * 1024 * 1024);

      return res.json({
        success: true,
        data: {
          isValid: true,
          fileInfo: {
            size: req.file.size,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
          },
        },
      });
    } catch (error) {
      logger.error('Audio validation failed', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        fileSize: req.file.size,
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid audio file',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export default router;
