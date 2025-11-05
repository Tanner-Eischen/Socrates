import { v4 as uuidv4 } from 'uuid';
import { ProblemParser } from '../../problem-parser';
import { ImageProcessor } from '../../image-processor';
import { ParsedProblem } from '../../types';
import { logger } from '../middleware/logger';

export interface SubmittedProblem {
  id: string;
  userId: string;
  submittedAt: Date;
  parsedProblem: ParsedProblem;
  originalImagePath?: string;
}

/**
 * In-memory storage for student-submitted problems
 * In production, this would be a database
 */
class ProblemProcessingService {
  private submittedProblems: Map<string, SubmittedProblem> = new Map();

  /**
   * Process a text problem submission
   */
  async processTextProblem(userId: string, problemText: string): Promise<SubmittedProblem> {
    try {
      logger.info('Processing text problem', { userId, textLength: problemText.length });

      // Parse the problem using ProblemParser
      const parsedProblem = ProblemParser.parseProblem(problemText);

      if (!parsedProblem.isValid) {
        throw new Error(`Invalid problem format: ${parsedProblem.errors?.join(', ') || 'Unknown error'}`);
      }

      // Create submitted problem record
      const submittedProblem: SubmittedProblem = {
        id: uuidv4(),
        userId,
        submittedAt: new Date(),
        parsedProblem,
      };

      // Store in memory
      this.submittedProblems.set(submittedProblem.id, submittedProblem);

      logger.info('Text problem processed successfully', {
        userId,
        problemId: submittedProblem.id,
        type: parsedProblem.problemType,
        difficulty: parsedProblem.difficulty,
      });

      return submittedProblem;
    } catch (error) {
      logger.error('Error processing text problem', { error, userId });
      throw error;
    }
  }

  /**
   * Process an image problem submission
   */
  async processImageProblem(userId: string, imagePath: string): Promise<SubmittedProblem> {
    try {
      logger.info('Processing image problem', { userId, imagePath });

      // Validate image file
      const validation = ImageProcessor.validateImageFile(imagePath);
      if (!validation.isValid) {
        throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
      }

      // Process image with OCR (OpenAI Vision)
      const imageResult = await ImageProcessor.processImage(imagePath);

      if (!imageResult.success) {
        throw new Error(`Image processing failed: ${imageResult.error}`);
      }

      // Parse the extracted text
      const parsedProblem = ProblemParser.parseProblem(imageResult.extractedText);

      if (!parsedProblem.isValid) {
        throw new Error(`Could not parse problem from image: ${parsedProblem.errors?.join(', ') || 'Unknown error'}`);
      }

      // Create submitted problem record
      const submittedProblem: SubmittedProblem = {
        id: uuidv4(),
        userId,
        submittedAt: new Date(),
        parsedProblem,
        originalImagePath: imagePath,
      };

      // Store in memory
      this.submittedProblems.set(submittedProblem.id, submittedProblem);

      logger.info('Image problem processed successfully', {
        userId,
        problemId: submittedProblem.id,
        type: parsedProblem.problemType,
        difficulty: parsedProblem.difficulty,
        confidence: imageResult.confidence,
      });

      return submittedProblem;
    } catch (error) {
      logger.error('Error processing image problem', { error, userId, imagePath });
      throw error;
    }
  }

  /**
   * Get a submitted problem by ID
   */
  getSubmittedProblem(problemId: string, userId: string): SubmittedProblem | null {
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
  getUserSubmittedProblems(userId: string, limit: number = 50): SubmittedProblem[] {
    return Array.from(this.submittedProblems.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Delete a submitted problem
   */
  deleteSubmittedProblem(problemId: string, userId: string): boolean {
    const problem = this.submittedProblems.get(problemId);
    
    if (problem && problem.userId === userId) {
      this.submittedProblems.delete(problemId);
      logger.info('Submitted problem deleted', { userId, problemId });
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
export const ProblemProcessingServiceInstance = new ProblemProcessingService();

