"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageProcessor = void 0;
class ImageProcessor {
    static validateImageFile(filePath) {
        return { isValid: true, errors: [] };
    }
    static async processImage(filePath) {
        return {
            success: true,
            extractedText: 'Extracted text from image',
            confidence: 0.8,
        };
    }
}
exports.ImageProcessor = ImageProcessor;
//# sourceMappingURL=image-processor.js.map