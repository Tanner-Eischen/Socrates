/**
 * Adaptive Learning Service
 * 
 * Tracks student ability levels and provides personalized question recommendations
 * based on performance history using Item Response Theory (IRT) principles.
 */

import { logger } from '../api/middleware/logger';

// ======================== INTERFACES ========================

export interface StudentAbility {
  userId: string;
  category: string;
  currentLevel: number;        // 1-10 scale
  confidence: number;          // 0-1 scale (how sure we are)
  assessmentsCompleted: number;
  lastUpdated: Date;
  history: PerformanceRecord[];
}

export interface PerformanceRecord {
  assessmentId: string;
  difficulty: number;
  correct: boolean;
  timestamp: Date;
  timeSpent?: number;          // seconds
  hintsUsed?: number;
  attemptNumber?: number;
}

export interface AssessmentRecommendation {
  assessmentId: string;
  difficulty: number;
  category: string;
  reason: string;
  confidence: number;          // How confident we are in this recommendation
  expectedSuccessRate: number; // Predicted probability of success (0-1)
}

export interface LearningAnalytics {
  userId: string;
  overallLevel: number;
  categoryLevels: Map<string, number>;
  learningVelocity: number;    // Rate of improvement (levels per week)
  strengths: string[];         // Categories where they excel
  weaknesses: string[];        // Categories needing work
  recentPerformance: PerformanceRecord[];
  progressOverTime: Array<{
    timestamp: Date;
    level: number;
    category: string;
  }>;
}

// ======================== IN-MEMORY STORAGE ========================

// In production, this would be a database
const studentAbilities: Map<string, Map<string, StudentAbility>> = new Map();

// ======================== ADAPTIVE LEARNING SERVICE ========================

export class AdaptiveLearningService {
  
  /**
   * Initialize a student's ability in a category (if not exists)
   */
  static initializeAbility(userId: string, category: string): StudentAbility {
    if (!studentAbilities.has(userId)) {
      studentAbilities.set(userId, new Map());
    }
    
    const userAbilities = studentAbilities.get(userId)!;
    
    if (!userAbilities.has(category)) {
      const ability: StudentAbility = {
        userId,
        category,
        currentLevel: 1,          // Start at beginner level
        confidence: 0.3,          // Low confidence initially
        assessmentsCompleted: 0,
        lastUpdated: new Date(),
        history: []
      };
      userAbilities.set(category, ability);
      
      logger.info('Initialized student ability', { userId, category, level: 1 });
    }
    
    return userAbilities.get(category)!;
  }
  
  /**
   * Get a student's ability level in a category
   */
  static getAbility(userId: string, category: string): StudentAbility {
    const userAbilities = studentAbilities.get(userId);
    if (!userAbilities || !userAbilities.has(category)) {
      return this.initializeAbility(userId, category);
    }
    return userAbilities.get(category)!;
  }
  
  /**
   * Get all abilities for a user
   */
  static getAllAbilities(userId: string): StudentAbility[] {
    const userAbilities = studentAbilities.get(userId);
    if (!userAbilities) return [];
    return Array.from(userAbilities.values());
  }
  
  /**
   * Update student ability based on assessment performance
   * Uses a simplified IRT (Item Response Theory) approach
   */
  static updateAbility(
    userId: string,
    category: string,
    assessmentDifficulty: number,
    correct: boolean,
    metadata?: {
      timeSpent?: number;
      hintsUsed?: number;
      attemptNumber?: number;
    }
  ): StudentAbility {
    const ability = this.getAbility(userId, category);
    
    // Record performance
    const record: PerformanceRecord = {
      assessmentId: `${category}-${Date.now()}`,
      difficulty: assessmentDifficulty,
      correct,
      timestamp: new Date(),
      ...metadata
    };
    ability.history.push(record);
    
    // Calculate expected performance (logistic function)
    const expectedCorrect = this.calculateExpectedPerformance(
      ability.currentLevel,
      assessmentDifficulty
    );
    
    // Update based on surprise (actual vs expected)
    const surprise = correct ? (1 - expectedCorrect) : -expectedCorrect;
    
    // Learning rate (decreases as we get more confident)
    const learningRate = 0.5 * (1 - ability.confidence * 0.5);
    
    // Adjust level
    const levelChange = surprise * learningRate;
    ability.currentLevel = Math.max(1, Math.min(10, ability.currentLevel + levelChange));
    
    // Update confidence (increases with more assessments, caps at 0.9)
    ability.assessmentsCompleted++;
    ability.confidence = Math.min(0.9, 
      0.3 + (ability.assessmentsCompleted * 0.05)
    );
    
    ability.lastUpdated = new Date();
    
    logger.info('Updated student ability', {
      userId,
      category,
      oldLevel: ability.currentLevel - levelChange,
      newLevel: ability.currentLevel,
      correct,
      surprise,
      confidence: ability.confidence
    });
    
    return ability;
  }
  
  /**
   * Calculate expected probability of correct answer
   * Based on student level vs question difficulty
   */
  private static calculateExpectedPerformance(
    studentLevel: number,
    questionDifficulty: number
  ): number {
    // Logistic function: P(correct) = 1 / (1 + e^(-k * (ability - difficulty)))
    const k = 0.7; // Steepness parameter
    const diff = studentLevel - questionDifficulty;
    return 1 / (1 + Math.exp(-k * diff));
  }
  
  /**
   * Recommend next assessment based on student ability
   * Targets questions slightly above current level (Zone of Proximal Development)
   */
  static recommendNextAssessment(
    userId: string,
    category: string,
    availableAssessments: Array<{
      id: string;
      difficulty: number;
      category: string;
      completed: boolean;
    }>
  ): AssessmentRecommendation | null {
    const ability = this.getAbility(userId, category);
    
    // Filter to incomplete assessments in this category
    const candidates = availableAssessments.filter(
      a => a.category === category && !a.completed
    );
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Target difficulty: slightly above current level (ZPD)
    const targetDifficulty = ability.currentLevel + 0.5;
    
    // Find best match
    let bestMatch = candidates[0];
    let bestScore = Math.abs(bestMatch.difficulty - targetDifficulty);
    
    for (const candidate of candidates) {
      const score = Math.abs(candidate.difficulty - targetDifficulty);
      if (score < bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    
    // Calculate expected success rate
    const expectedSuccess = this.calculateExpectedPerformance(
      ability.currentLevel,
      bestMatch.difficulty
    );
    
    // Determine reason
    let reason = '';
    if (bestMatch.difficulty < ability.currentLevel - 1) {
      reason = 'Review: Below your current level - good for reinforcement';
    } else if (bestMatch.difficulty > ability.currentLevel + 2) {
      reason = 'Challenge: Above your current level - stretch goal';
    } else {
      reason = 'Optimal: Matched to your learning zone';
    }
    
    return {
      assessmentId: bestMatch.id,
      difficulty: bestMatch.difficulty,
      category: bestMatch.category,
      reason,
      confidence: ability.confidence,
      expectedSuccessRate: expectedSuccess
    };
  }
  
  /**
   * Get learning analytics for a student
   */
  static getLearningAnalytics(userId: string): LearningAnalytics {
    const abilities = this.getAllAbilities(userId);
    
    if (abilities.length === 0) {
      return {
        userId,
        overallLevel: 3,
        categoryLevels: new Map(),
        learningVelocity: 0,
        strengths: [],
        weaknesses: [],
        recentPerformance: [],
        progressOverTime: []
      };
    }
    
    // Calculate overall level (weighted average)
    const totalAssessments = abilities.reduce((sum, a) => sum + a.assessmentsCompleted, 0);
    const overallLevel = totalAssessments > 0
      ? abilities.reduce((sum, a) => sum + (a.currentLevel * a.assessmentsCompleted), 0) / totalAssessments
      : 3;
    
    // Category levels
    const categoryLevels = new Map<string, number>();
    abilities.forEach(a => categoryLevels.set(a.category, a.currentLevel));
    
    // Calculate learning velocity (levels per week)
    const allHistory = abilities.flatMap(a => 
      a.history.map(h => ({ ...h, category: a.category }))
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let learningVelocity = 0;
    if (allHistory.length >= 2) {
      const firstRecord = allHistory[0];
      const lastRecord = allHistory[allHistory.length - 1];
      const timeSpanWeeks = (lastRecord.timestamp.getTime() - firstRecord.timestamp.getTime()) 
        / (1000 * 60 * 60 * 24 * 7);
      
      if (timeSpanWeeks > 0) {
        // Calculate level change by comparing early vs late performance
        const earlyPerf = allHistory.slice(0, Math.floor(allHistory.length / 3));
        const latePerf = allHistory.slice(-Math.floor(allHistory.length / 3));
        const earlyAvg = earlyPerf.reduce((sum, r) => sum + r.difficulty, 0) / earlyPerf.length;
        const lateAvg = latePerf.reduce((sum, r) => sum + r.difficulty, 0) / latePerf.length;
        learningVelocity = (lateAvg - earlyAvg) / timeSpanWeeks;
      }
    }
    
    // Identify strengths (top 2 categories)
    const sortedByLevel = [...abilities].sort((a, b) => b.currentLevel - a.currentLevel);
    const strengths = sortedByLevel
      .slice(0, 2)
      .filter(a => a.currentLevel >= 5)
      .map(a => a.category);
    
    // Identify weaknesses (bottom 2 categories)
    const weaknesses = sortedByLevel
      .slice(-2)
      .filter(a => a.currentLevel <= 4)
      .map(a => a.category);
    
    // Recent performance (last 10 records)
    const recentPerformance = allHistory.slice(-10);
    
    // Progress over time
    const progressOverTime: Array<{ timestamp: Date; level: number; category: string }> = [];
    abilities.forEach(ability => {
      let runningLevel = 3; // Starting level
      ability.history.forEach(record => {
        // Simulate level at each point in history
        const expectedCorrect = this.calculateExpectedPerformance(runningLevel, record.difficulty);
        const surprise = record.correct ? (1 - expectedCorrect) : -expectedCorrect;
        const learningRate = 0.5;
        runningLevel = Math.max(1, Math.min(10, runningLevel + surprise * learningRate));
        
        progressOverTime.push({
          timestamp: record.timestamp,
          level: runningLevel,
          category: ability.category
        });
      });
    });
    progressOverTime.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return {
      userId,
      overallLevel,
      categoryLevels,
      learningVelocity,
      strengths,
      weaknesses,
      recentPerformance,
      progressOverTime
    };
  }
  
  /**
   * Reset a student's abilities (for testing/admin)
   */
  static resetAbilities(userId: string): void {
    studentAbilities.delete(userId);
    logger.info('Reset student abilities', { userId });
  }
}

