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
export declare class VoiceService {
    private static db;
    private static openai;
    /**
     * Initialize OpenAI client
     */
    static initialize(): void;
    /**
     * Convert speech to text using OpenAI Whisper
     */
    static speechToText(audioBuffer: Buffer, options?: VoiceProcessingOptions): Promise<SpeechToTextResult>;
    /**
     * Convert text to speech using OpenAI TTS
     */
    static textToSpeech(text: string, options?: TTSOptions): Promise<TextToSpeechResult>;
    /**
     * Process voice interaction and save to database
     */
    static processVoiceInteraction(interactionId: string, audioBuffer: Buffer, options?: VoiceProcessingOptions): Promise<VoiceInteraction>;
    /**
     * Save voice interaction to database
     */
    static saveVoiceInteraction(data: {
        interactionId: string;
        audioUrl?: string;
        transcript: string;
        language: string;
        confidenceScore?: number;
        processingDuration: number;
    }): Promise<VoiceInteraction>;
    /**
     * Get voice interaction by ID
     */
    static getVoiceInteraction(id: string): Promise<VoiceInteraction | null>;
    /**
     * Get voice interactions by interaction ID
     */
    static getVoiceInteractionsByInteractionId(interactionId: string): Promise<VoiceInteraction[]>;
    /**
     * Get voice interactions for a user with optional filters
     */
    static getVoiceInteractions(userId: string, options?: {
        type?: 'speech_to_text' | 'text_to_speech';
        sessionId?: string;
        limit?: number;
        offset?: number;
    }): Promise<({
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
    })[]>;
    /**
     * Get voice interaction statistics
     */
    static getVoiceStats(userId?: string): Promise<{
        totalVoiceInteractions: number;
        averageConfidence: number;
        averageProcessingTime: number;
        languageDistribution: {
            language: string;
            count: number;
        }[];
        totalTranscriptLength: number;
    }>;
    /**
     * Validate audio format and size
     */
    static validateAudioInput(audioBuffer: Buffer, maxSizeBytes?: number): void;
    /**
     * Get supported languages for speech recognition
     */
    static getSupportedLanguages(): string[];
    /**
     * Get supported voices for text-to-speech
     */
    static getSupportedVoices(): TTSOptions['voice'][];
}
export default VoiceService;
//# sourceMappingURL=VoiceService.d.ts.map