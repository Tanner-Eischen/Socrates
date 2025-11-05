import { ImageProcessResult, UploadedFile, ValidationResult } from './types';
export declare class ImageProcessor {
    private static readonly SUPPORTED_FORMATS;
    private static readonly MAX_FILE_SIZE;
    private static readonly PROCESSING_TIMEOUT;
    private static apiKey;
    /**
     * Initialize the image processor with OpenAI API key
     */
    static initialize(apiKey: string): void;
    /**
     * Validate an uploaded image file
     */
    static validateImageFile(filePath: string): ValidationResult;
    /**
     * Process an image file and extract mathematical content using OCR
     */
    static processImage(filePath: string): Promise<ImageProcessResult>;
    /**
     * Convert image file to base64 string
     */
    private static convertToBase64;
    /**
     * Get MIME type based on file extension
     */
    private static getMimeType;
    /**
     * Call OpenAI Vision API to extract text from image
     */
    private static callVisionAPI;
    /**
     * Calculate confidence score based on extracted text quality
     */
    private static calculateConfidence;
    /**
     * Format file size for display
     */
    private static formatFileSize;
    /**
     * Create uploaded file metadata
     */
    static createFileMetadata(filePath: string): UploadedFile;
    /**
     * Clean up temporary files
     */
    static cleanupTempFiles(filePaths: string[]): void;
    /**
     * Generate processing status message
     */
    static generateStatusMessage(result: ImageProcessResult): string;
    /**
     * Validate OCR result quality
     */
    static validateOCRResult(result: ImageProcessResult): ValidationResult;
}
//# sourceMappingURL=image-processor.d.ts.map