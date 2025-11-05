// Main entry point for SocraTeach modules
// This helps with IDE module resolution

// Core engine exports
export { SocraticEngine } from './socratic-engine';

// Type definitions
export * from './types';

// Problem bank
export { TEST_PROBLEMS, PROBLEM_DESCRIPTIONS } from './problem-bank';

// Controllers and managers
export { AdaptiveController } from './adaptive-controller';
export { SessionManager } from './session-manager';
export { AnalyticsEngine } from './analytics-engine';
export { StudyPlanner } from './study-planner';

// Data and storage
export { LocalStorageManager } from './data-storage';

// Processing utilities
export { ImageProcessor } from './image-processor';
export { ProblemClassifier } from './problem-classifier';
export { ProblemParser } from './problem-parser';