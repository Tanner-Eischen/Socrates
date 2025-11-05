// Main entry point for SocraTeach modules
// This helps with IDE module resolution

// Core engine exports
export { SocraticEngine } from './socratic-engine';

// Type definitions
export * from './types';

// Problem bank
export { TEST_PROBLEMS, PROBLEM_DESCRIPTIONS } from './problem-bank';

// Managers
export { SessionManager } from './session-manager';

// Processing utilities
export { ImageProcessor } from './image-processor';
export { ProblemParser } from './problem-parser';