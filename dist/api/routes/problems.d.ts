declare const router: import("express-serve-static-core").Router;
interface Problem {
    id: string;
    title: string;
    description: string;
    type: string;
    difficultyLevel: number;
    tags: string[];
    category: string;
    estimatedTime: number;
    hints: string[];
    solution?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    isActive: boolean;
    isAssessment: boolean;
    prerequisites?: string[];
    expectedAnswer?: string;
}
export declare function getProblemById(id: string): Problem | undefined;
export default router;
//# sourceMappingURL=problems.d.ts.map