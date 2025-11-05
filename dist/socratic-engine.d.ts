import { Message, StudentProfile, SessionPerformance, DifficultyLevel } from './types';
import { SessionManager } from './session-manager';
export declare class SocraticEngine {
    private openai;
    private conversation;
    private problem;
    private sessionId;
    private studentProfile?;
    private analyticsEngine;
    private adaptiveController;
    private sessionManager;
    private currentDifficulty;
    private sessionStartTime;
    private strugglingTurns;
    private lastResponseTime;
    constructor(sessionManager?: SessionManager);
    initializeSession(sessionId: string, studentProfile?: StudentProfile): void;
    startProblem(problem: string): Promise<string>;
    respondToStudent(studentInput: string): Promise<string>;
    getConversationHistory(): Message[];
    getCurrentProblem(): string;
    getConversationLength(): number;
    private trackStudentEngagement;
    private analyzeEngagement;
    private detectStruggling;
    getSessionPerformance(): SessionPerformance;
    private calculateCompletionRate;
    private extractConceptsFromConversation;
    getCurrentDifficulty(): DifficultyLevel;
    updateDifficulty(newDifficulty: DifficultyLevel): void;
    containsDirectAnswer(response: string): boolean;
    private convertNumericToDifficultyLevel;
}
//# sourceMappingURL=socratic-engine.d.ts.map