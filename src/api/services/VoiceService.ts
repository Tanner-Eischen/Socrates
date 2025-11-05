import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { logger } from '../middleware/logger';
import OpenAI from 'openai';

export interface VoiceInteraction {
  id: string;
  interactionId: string;
  audioUrl?: string;
  transcript: string;
  language: string;
  confidenceScore?: number;
  processingDuration: number;
  createdAt: Date;
}

export interface SpeechToTextResult {
  transcript: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface TextToSpeechResult {
  audioUrl: string;
  duration: number;
  format: string;
}

export interface VoiceProcessingOptions {
  language?: string;
  model?: 'whisper-1';
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number;
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
}

export class VoiceService {
  private static db = DatabaseService;
  private static openai: OpenAI;

  /**
   * Initialize OpenAI client
   */
  static initialize() {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not found. Voice features will be limited.');
      return;
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('Voice service initialized with OpenAI');
  }

  /**
   * Convert speech to text using OpenAI Whisper
   */
  static async speechToText(
    audioBuffer: Buffer,
    options: VoiceProcessingOptions = {}
  ): Promise<SpeechToTextResult> {
    const startTime = Date.now();

    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized. Please check API key configuration.');
      }

      // Create a temporary file-like object for the API
      const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: options.model || 'whisper-1',
        language: options.language,
        response_format: options.responseFormat || 'verbose_json',
        temperature: options.temperature || 0,
      });

      const processingDuration = Date.now() - startTime;

      let transcript: string;
      let confidence: number = 0;
      let detectedLanguage: string = options.language || 'en';

      if (typeof transcription === 'string') {
        transcript = transcription;
      } else {
        transcript = transcription.text;
        // Extract additional metadata if available
        if ('segments' in transcription && transcription.segments) {
          // Calculate average confidence from segments
          const segments = transcription.segments as any[];
          if (segments.length > 0) {
            confidence = segments.reduce((sum, seg) => sum + (seg.avg_logprob || 0), 0) / segments.length;
            confidence = Math.max(0, Math.min(1, (confidence + 1) / 2)); // Normalize to 0-1
          }
        }
        if ('language' in transcription) {
          detectedLanguage = transcription.language as string;
        }
      }

      logger.info('Speech-to-text conversion completed', {
        processingDuration,
        transcriptLength: transcript.length,
        confidence,
        language: detectedLanguage,
      });

      return {
        transcript,
        confidence,
        language: detectedLanguage,
        duration: processingDuration,
      };
    } catch (error) {
      const processingDuration = Date.now() - startTime;
      logger.error('Speech-to-text conversion failed', { error, processingDuration });
      throw error;
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   */
  static async textToSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<TextToSpeechResult> {
    const startTime = Date.now();

    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized. Please check API key configuration.');
      }

      const response = await this.openai.audio.speech.create({
        model: options.model || 'tts-1',
        voice: options.voice || 'alloy',
        input: text,
        response_format: options.responseFormat || 'mp3',
        speed: options.speed || 1.0,
      });

      const processingDuration = Date.now() - startTime;

      // Convert response to buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // In a real implementation, you would save this to a file storage service
      // For now, we'll create a mock URL
      const audioUrl = `data:audio/${options.responseFormat || 'mp3'};base64,${audioBuffer.toString('base64')}`;

      logger.info('Text-to-speech conversion completed', {
        processingDuration,
        textLength: text.length,
        voice: options.voice,
        audioSize: audioBuffer.length,
      });

      return {
        audioUrl,
        duration: processingDuration,
        format: options.responseFormat || 'mp3',
      };
    } catch (error) {
      const processingDuration = Date.now() - startTime;
      logger.error('Text-to-speech conversion failed', { error, processingDuration });
      throw error;
    }
  }

  /**
   * Process voice interaction and save to database
   */
  static async processVoiceInteraction(
    interactionId: string,
    audioBuffer: Buffer,
    options: VoiceProcessingOptions = {}
  ): Promise<VoiceInteraction> {
    try {
      // Convert speech to text
      const sttResult = await this.speechToText(audioBuffer, options);

      // Save voice interaction to database
      const voiceInteraction = await this.saveVoiceInteraction({
        interactionId,
        transcript: sttResult.transcript,
        language: sttResult.language,
        confidenceScore: sttResult.confidence,
        processingDuration: sttResult.duration,
      });

      logger.info('Voice interaction processed and saved', {
        voiceInteractionId: voiceInteraction.id,
        interactionId,
        transcriptLength: sttResult.transcript.length,
      });

      return voiceInteraction;
    } catch (error) {
      logger.error('Error processing voice interaction', { error, interactionId });
      throw error;
    }
  }

  /**
   * Save voice interaction to database
   */
  static async saveVoiceInteraction(data: {
    interactionId: string;
    audioUrl?: string;
    transcript: string;
    language: string;
    confidenceScore?: number;
    processingDuration: number;
  }): Promise<VoiceInteraction> {
    try {
      const voiceInteractionId = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO voice_interactions (id, interaction_id, audio_url, transcript, language, confidence_score, processing_duration, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        voiceInteractionId,
        data.interactionId,
        data.audioUrl || null,
        data.transcript,
        data.language,
        data.confidenceScore || null,
        data.processingDuration,
        now,
      ];

      const result = await this.db.query(query, values);
      const voiceInteraction = result.rows[0];

      return {
        id: voiceInteraction.id,
        interactionId: voiceInteraction.interaction_id,
        audioUrl: voiceInteraction.audio_url,
        transcript: voiceInteraction.transcript,
        language: voiceInteraction.language,
        confidenceScore: voiceInteraction.confidence_score,
        processingDuration: voiceInteraction.processing_duration,
        createdAt: voiceInteraction.created_at,
      };
    } catch (error) {
      logger.error('Error saving voice interaction', { error, data });
      throw error;
    }
  }

  /**
   * Get voice interaction by ID
   */
  static async getVoiceInteraction(id: string): Promise<VoiceInteraction | null> {
    try {
      const query = `SELECT * FROM voice_interactions WHERE id = $1`;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const voiceInteraction = result.rows[0];
      return {
        id: voiceInteraction.id,
        interactionId: voiceInteraction.interaction_id,
        audioUrl: voiceInteraction.audio_url,
        transcript: voiceInteraction.transcript,
        language: voiceInteraction.language,
        confidenceScore: voiceInteraction.confidence_score,
        processingDuration: voiceInteraction.processing_duration,
        createdAt: voiceInteraction.created_at,
      };
    } catch (error) {
      logger.error('Error getting voice interaction', { error, id });
      throw error;
    }
  }

  /**
   * Get voice interactions by interaction ID
   */
  static async getVoiceInteractionsByInteractionId(interactionId: string): Promise<VoiceInteraction[]> {
    try {
      const query = `
        SELECT * FROM voice_interactions 
        WHERE interaction_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [interactionId]);

      return result.rows.map(voiceInteraction => ({
        id: voiceInteraction.id,
        interactionId: voiceInteraction.interaction_id,
        audioUrl: voiceInteraction.audio_url,
        transcript: voiceInteraction.transcript,
        language: voiceInteraction.language,
        confidenceScore: voiceInteraction.confidence_score,
        processingDuration: voiceInteraction.processing_duration,
        createdAt: voiceInteraction.created_at,
      }));
    } catch (error) {
      logger.error('Error getting voice interactions by interaction ID', { error, interactionId });
      throw error;
    }
  }

  /**
   * Get voice interactions for a user with optional filters
   */
  static async getVoiceInteractions(
    userId: string,
    options: { type?: 'speech_to_text' | 'text_to_speech'; sessionId?: string; limit?: number; offset?: number } = {}
  ): Promise<({
    id: string;
    interactionId: string;
    audioUrl?: string;
    transcript: string;
    language: string;
    confidenceScore?: number;
    processingDuration: number;
    createdAt: Date;
    interactionType: 'speech_to_text' | 'text_to_speech';
    sessionId: string;
  })[]> {
    try {
      const filters: string[] = ['i.user_id = $1'];
      const values: any[] = [userId];
      let paramIndex = 2;

      if (options.sessionId) {
        filters.push(`i.session_id = $${paramIndex++}`);
        values.push(options.sessionId);
      }

      // Derive type based on presence of audio_url
      let typeCondition = '';
      if (options.type === 'speech_to_text') {
        typeCondition = 'AND vi.audio_url IS NULL';
      } else if (options.type === 'text_to_speech') {
        typeCondition = 'AND vi.audio_url IS NOT NULL';
      }

      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;

      const query = `
        SELECT 
          vi.id,
          vi.interaction_id,
          vi.audio_url,
          vi.transcript,
          vi.language,
          vi.confidence_score,
          vi.processing_duration,
          vi.created_at,
          i.session_id,
          CASE WHEN vi.audio_url IS NULL THEN 'speech_to_text' ELSE 'text_to_speech' END AS interaction_type
        FROM voice_interactions vi
        JOIN interactions i ON vi.interaction_id = i.id
        WHERE ${filters.join(' AND ')}
        ${typeCondition}
        ORDER BY vi.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);

      const result = await this.db.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        interactionId: row.interaction_id,
        audioUrl: row.audio_url,
        transcript: row.transcript,
        language: row.language,
        confidenceScore: row.confidence_score,
        processingDuration: row.processing_duration,
        createdAt: row.created_at,
        interactionType: row.interaction_type,
        sessionId: row.session_id,
      }));
    } catch (error) {
      logger.error('Error getting voice interactions', { error, userId, options });
      throw error;
    }
  }
  /**
   * Get voice interaction statistics
   */
  static async getVoiceStats(userId?: string): Promise<{
    totalVoiceInteractions: number;
    averageConfidence: number;
    averageProcessingTime: number;
    languageDistribution: { language: string; count: number }[];
    totalTranscriptLength: number;
  }> {
    try {
      let userFilter = '';
      const queryParams: any[] = [];

      if (userId) {
        userFilter = `
          JOIN interactions i ON vi.interaction_id = i.id 
          WHERE i.user_id = $1
        `;
        queryParams.push(userId);
      }

      const query = `
        SELECT 
          COUNT(*) as total_interactions,
          AVG(confidence_score) as avg_confidence,
          AVG(processing_duration) as avg_processing_time,
          SUM(LENGTH(transcript)) as total_transcript_length
        FROM voice_interactions vi
        ${userFilter}
      `;

      const result = await this.db.query(query, queryParams);
      const stats = result.rows[0];

      // Get language distribution
      const languageQuery = `
        SELECT 
          language,
          COUNT(*) as count
        FROM voice_interactions vi
        ${userFilter}
        GROUP BY language
        ORDER BY count DESC
      `;

      const languageResult = await this.db.query(languageQuery, queryParams);
      const languageDistribution = languageResult.rows.map(row => ({
        language: row.language,
        count: parseInt(row.count),
      }));

      return {
        totalVoiceInteractions: parseInt(stats.total_interactions),
        averageConfidence: parseFloat(stats.avg_confidence) || 0,
        averageProcessingTime: parseFloat(stats.avg_processing_time) || 0,
        languageDistribution,
        totalTranscriptLength: parseInt(stats.total_transcript_length) || 0,
      };
    } catch (error) {
      logger.error('Error getting voice stats', { error, userId });
      throw error;
    }
  }

  /**
   * Validate audio format and size
   */
  static validateAudioInput(audioBuffer: Buffer, maxSizeBytes: number = 25 * 1024 * 1024): void {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty');
    }

    if (audioBuffer.length > maxSizeBytes) {
      throw new Error(`Audio file too large. Maximum size is ${maxSizeBytes / (1024 * 1024)}MB`);
    }

    // Check for common audio file headers
    const header = audioBuffer.slice(0, 12);
    const isValidAudio = 
      header.includes(Buffer.from('RIFF')) || // WAV
      header.includes(Buffer.from('ID3')) ||  // MP3
      header.includes(Buffer.from('OggS')) || // OGG
      header.includes(Buffer.from('fLaC')) || // FLAC
      header.slice(4, 8).equals(Buffer.from('ftyp')); // MP4/M4A

    if (!isValidAudio) {
      throw new Error('Invalid audio format. Supported formats: WAV, MP3, OGG, FLAC, M4A');
    }
  }

  /**
   * Get supported languages for speech recognition
   */
  static getSupportedLanguages(): string[] {
    return [
      'af', 'ar', 'hy', 'az', 'be', 'bs', 'bg', 'ca', 'zh', 'hr', 'cs', 'da', 'nl',
      'en', 'et', 'fi', 'fr', 'gl', 'de', 'el', 'he', 'hi', 'hu', 'is', 'id', 'it',
      'ja', 'kn', 'kk', 'ko', 'lv', 'lt', 'mk', 'ms', 'mr', 'mi', 'ne', 'no', 'fa',
      'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw', 'sv', 'tl', 'ta', 'th',
      'tr', 'uk', 'ur', 'vi', 'cy'
    ];
  }

  /**
   * Get supported voices for text-to-speech
   */
  static getSupportedVoices(): TTSOptions['voice'][] {
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  }
}

export default VoiceService;