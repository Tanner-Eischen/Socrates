import { ParsedProblem } from '../../problem-parser';
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
declare class ProblemProcessingService {
    private submittedProblems;
    /**
     * Process a text problem submission
     */
    processTextProblem(userId: string, problemText: string): Promise<SubmittedProblem>;
    /**
     * Process an image problem submission
     */
    processImageProblem(userId: string, imagePath: string): Promise<SubmittedProblem>;
    /**
     * Get a submitted problem by ID
     */
    getSubmittedProblem(problemId: string, userId: string): SubmittedProblem | null;
    /**
     * Get all submitted problems for a user
     */
    getUserSubmittedProblems(userId: string, limit?: number): SubmittedProblem[];
    /**
     * Delete a submitted problem
     */
    deleteSubmittedProblem(problemId: string, userId: string): boolean;
}
export declare const ProblemProcessingServiceInstance: ProblemProcessingService;
export {};
//# sourceMappingURL=ProblemProcessingService.d.ts.map