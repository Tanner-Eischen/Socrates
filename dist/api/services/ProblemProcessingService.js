"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemProcessingServiceInstance = void 0;
const uuid_1 = require("uuid");
const problem_parser_1 = require("../../problem-parser");
const image_processor_1 = require("../../image-processor");
const logger_1 = require("../middleware/logger");
/**
 * In-memory storage for student-submitted problems
 * In production, this would be a database
 */
class ProblemProcessingService {
    constructor() {
        this.submittedProblems = new Map();
    }
    /**
     * Process a text problem submission
     */
    async processTextProblem(userId, problemText) {
        try {
            logger_1.logger.info('Processing text problem', { userId, textLength: problemText.length });
            // Parse the problem using ProblemParser
            const parsedProblem = problem_parser_1.ProblemParser.parseProblem(problemText);
            if (!parsedProblem.isValid) {
                throw new Error(`Invalid problem format: ${parsedProblem.errors?.join(', ') || 'Unknown error'}`);
            }
            // Create submitted problem record
            const submittedProblem = {
                id: (0, uuid_1.v4)(),
                userId,
                submittedAt: new Date(),
                parsedProblem,
            };
            // Store in memory
            this.submittedProblems.set(submittedProblem.id, submittedProblem);
            logger_1.logger.info('Text problem processed successfully', {
                userId,
                problemId: submittedProblem.id,
                type: parsedProblem.problemType,
                difficulty: parsedProblem.difficulty,
            });
            return submittedProblem;
        }
        catch (error) {
            logger_1.logger.error('Error processing text problem', { error, userId });
            throw error;
        }
    }
    /**
     * Process an image problem submission
     */
    async processImageProblem(userId, imagePath) {
        try {
            logger_1.logger.info('Processing image problem', { userId, imagePath });
            // Validate image file
            const validation = image_processor_1.ImageProcessor.validateImageFile(imagePath);
            if (!validation.isValid) {
                throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
            }
            // Process image with OCR (OpenAI Vision)
            let imageResult;
            try {
                imageResult = await image_processor_1.ImageProcessor.processImage(imagePath);
            }
            catch (error) {
                const { handleImageProcessingError } = require('../../lib/error-utils');
                throw handleImageProcessingError(error, 'Image OCR processing');
            }
            if (!imageResult.success) {
                const { ImageProcessingError } = require('../middleware/errorHandler');
                throw new ImageProcessingError(imageResult.error || 'Failed to extract text from image. Please ensure the image is clear and contains readable text.');
            }
            // Parse the extracted text
            const parsedProblem = problem_parser_1.ProblemParser.parseProblem(imageResult.extractedText);
            if (!parsedProblem.isValid) {
                throw new Error(`Could not parse problem from image: ${parsedProblem.errors?.join(', ') || 'Unknown error'}`);
            }
            // Create submitted problem record
            const submittedProblem = {
                id: (0, uuid_1.v4)(),
                userId,
                submittedAt: new Date(),
                parsedProblem,
                originalImagePath: imagePath,
            };
            // Store in memory
            this.submittedProblems.set(submittedProblem.id, submittedProblem);
            logger_1.logger.info('Image problem processed successfully', {
                userId,
                problemId: submittedProblem.id,
                type: parsedProblem.problemType,
                difficulty: parsedProblem.difficulty,
                confidence: imageResult.confidence,
            });
            return submittedProblem;
        }
        catch (error) {
            logger_1.logger.error('Error processing image problem', { error, userId, imagePath });
            throw error;
        }
    }
    /**
     * Get a submitted problem by ID
     */
    getSubmittedProblem(problemId, userId) {
        const problem = this.submittedProblems.get(problemId);
        // Ensure user can only access their own submitted problems
        if (problem && problem.userId === userId) {
            return problem;
        }
        return null;
    }
    /**
     * Get all submitted problems for a user
     */
    getUserSubmittedProblems(userId, limit = 50) {
        return Array.from(this.submittedProblems.values())
            .filter(p => p.userId === userId)
            .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
            .slice(0, limit);
    }
    /**
     * Delete a submitted problem
     */
    deleteSubmittedProblem(problemId, userId) {
        const problem = this.submittedProblems.get(problemId);
        if (problem && problem.userId === userId) {
            this.submittedProblems.delete(problemId);
            logger_1.logger.info('Submitted problem deleted', { userId, problemId });
            return true;
        }
        return false;
    }
}
// Export singleton instance
exports.ProblemProcessingServiceInstance = new ProblemProcessingService();
//# sourceMappingURL=ProblemProcessingService.js.map