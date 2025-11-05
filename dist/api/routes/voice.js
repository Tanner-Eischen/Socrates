"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const VoiceService_1 = require("../services/VoiceService");
const SessionService_1 = __importDefault(require("../services/SessionService"));
const AnalyticsService_1 = require("../services/AnalyticsService");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../middleware/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
    },
    fileFilter: (req, file, cb) => {
        // Accept audio files
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only audio files are allowed'));
        }
    },
});
// Validation schemas
const textToSpeechSchema = joi_1.default.object({
    text: joi_1.default.string().required().min(1).max(4000),
    voice: joi_1.default.string().valid('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer').default('alloy'),
    model: joi_1.default.string().valid('tts-1', 'tts-1-hd').default('tts-1'),
    speed: joi_1.default.number().min(0.25).max(4.0).default(1.0),
    format: joi_1.default.string().valid('mp3', 'opus', 'aac', 'flac').default('mp3'),
});
const speechToTextSchema = joi_1.default.object({
    language: joi_1.default.string().optional(),
    prompt: joi_1.default.string().max(500).optional(),
    temperature: joi_1.default.number().min(0).max(1).default(0),
    sessionId: joi_1.default.string().optional(),
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
router.post('/speech-to-text', auth_1.authenticate, rateLimiter_1.voiceRateLimiter, upload.single('audio'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
        const result = await VoiceService_1.VoiceService.speechToText(req.file.buffer, {
            language: value.language,
            temperature: value.temperature,
        });
        const processingTime = Date.now() - startTime;
        let voiceInteractionId;
        if (value.sessionId) {
            const interaction = await SessionService_1.default.addInteraction({
                sessionId: value.sessionId,
                userId: req.user.id,
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
            const saved = await VoiceService_1.VoiceService.saveVoiceInteraction({
                interactionId: interaction.id,
                transcript: result.transcript,
                language: result.language,
                confidenceScore: result.confidence,
                processingDuration: result.duration,
            });
            voiceInteractionId = saved.id;
        }
        // Track speech-to-text usage
        await AnalyticsService_1.AnalyticsService.trackEvent({
            userId: req.user.id,
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
        logger_1.logger.info('Speech-to-text conversion completed', {
            userId: req.user.id,
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
    }
    catch (error) {
        logger_1.logger.error('Speech-to-text conversion failed', {
            userId: req.user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            fileSize: req.file.size,
        });
        // Track failed conversion
        await AnalyticsService_1.AnalyticsService.trackEvent({
            userId: req.user.id,
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
}));
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
router.post('/text-to-speech', auth_1.authenticate, rateLimiter_1.voiceRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
        const ttsResult = await VoiceService_1.VoiceService.textToSpeech(value.text, {
            voice: value.voice,
            model: value.model,
            speed: value.speed,
            responseFormat: value.format,
        });
        const processingTime = Date.now() - startTime;
        // Optionally save a voice interaction if a session is provided in future
        // Track text-to-speech usage
        await AnalyticsService_1.AnalyticsService.trackEvent({
            userId: req.user.id,
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
        logger_1.logger.info('Text-to-speech conversion completed', {
            userId: req.user.id,
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
    }
    catch (error) {
        logger_1.logger.error('Text-to-speech conversion failed', {
            userId: req.user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            textLength: value.text.length,
        });
        // Track failed conversion
        await AnalyticsService_1.AnalyticsService.trackEvent({
            userId: req.user.id,
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
}));
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
router.get('/interactions', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type;
    const sessionId = req.query.sessionId;
    const interactions = await VoiceService_1.VoiceService.getVoiceInteractions(req.user.id, { type: type || undefined, sessionId, limit, offset });
    res.json({
        success: true,
        data: interactions,
        pagination: {
            limit,
            offset,
            total: interactions.length,
        },
    });
}));
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
router.get('/stats', auth_1.authenticate, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const timeframe = req.query.timeframe || 'month';
    if (!['day', 'week', 'month', 'year'].includes(timeframe)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid timeframe. Must be day, week, month, or year.',
        });
    }
    const stats = await VoiceService_1.VoiceService.getVoiceStats(req.user.id);
    return res.json({
        success: true,
        data: stats,
    });
}));
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
router.get('/languages', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const languages = VoiceService_1.VoiceService.getSupportedLanguages();
    return res.json({
        success: true,
        data: languages,
    });
}));
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
router.get('/voices', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const voices = VoiceService_1.VoiceService.getSupportedVoices();
    return res.json({
        success: true,
        data: voices,
    });
}));
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
router.post('/validate-audio', auth_1.authenticate, rateLimiter_1.rateLimiter, upload.single('audio'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Audio file is required',
        });
    }
    try {
        // validateAudioInput throws on invalid input; no return value on success
        VoiceService_1.VoiceService.validateAudioInput(req.file.buffer, 25 * 1024 * 1024);
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
    }
    catch (error) {
        logger_1.logger.error('Audio validation failed', {
            userId: req.user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            fileSize: req.file.size,
        });
        return res.status(400).json({
            success: false,
            message: 'Invalid audio file',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
exports.default = router;
//# sourceMappingURL=voice.js.map