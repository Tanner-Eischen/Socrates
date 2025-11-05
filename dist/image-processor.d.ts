/**
 * Image Processor - Handles image uploads and OCR
 */
export interface ImageProcessResult {
    success: boolean;
    error?: string;
    extractedText: string;
    confidence: number;
}
export declare class ImageProcessor {
    static validateImageFile(filePath: string): {
        isValid: boolean;
        errors: string[];
    };
    static processImage(filePath: string): Promise<ImageProcessResult>;
}
//# sourceMappingURL=image-processor.d.ts.map