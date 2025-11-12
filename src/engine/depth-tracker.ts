/**
 * Depth Tracker Module
 * Manages conversation depth and conceptual connections
 */

import type { ConversationDepthTracker, SocraticAssessment, BehavioralAssessment } from './types';
import { SocraticQuestionType, DialogueLevel, CycleStage } from './types';

export class DepthTrackerManager {
  private tracker: ConversationDepthTracker;

  constructor() {
    this.tracker = {
      currentDepth: 1,
      maxDepthReached: 1,
      conceptualConnections: [],
      shouldDeepenInquiry: false,
      suggestedNextLevel: 1,
      questionType: SocraticQuestionType.CLARIFICATION,
      dialogueLevel: DialogueLevel.DIALOGUE,
      cycleStage: CycleStage.WONDER_RECEIVE
    };
  }

  /**
   * Get current depth tracker
   */
  getTracker(): ConversationDepthTracker {
    return { ...this.tracker };
  }

  /**
   * Update depth tracker based on assessment and student input
   */
  updateDepthTracker(assessment: SocraticAssessment, studentInput: string, extractConcepts: (text: string) => string[]): void {
    // Increase depth if student shows good understanding
    if (assessment.readinessForAdvancement && assessment.depthOfThinking >= 3) {
      this.tracker.currentDepth = Math.min(this.tracker.currentDepth + 1, 5);
      this.tracker.maxDepthReached = Math.max(this.tracker.maxDepthReached, this.tracker.currentDepth);
    }
    
    // Track conceptual connections mentioned
    const concepts = extractConcepts(studentInput);
    this.tracker.conceptualConnections.push(...concepts);
    
    // Limit conceptual connections to prevent memory bloat
    if (this.tracker.conceptualConnections.length > 20) {
      this.tracker.conceptualConnections = this.tracker.conceptualConnections.slice(-20);
    }
    
    // Determine if we should deepen inquiry
    this.tracker.shouldDeepenInquiry = assessment.depthOfThinking >= 3 && assessment.confidenceLevel > 0.6;
    this.tracker.suggestedNextLevel = Math.min(this.tracker.currentDepth + 1, 5);
  }

  /**
   * Update question type in tracker
   */
  updateQuestionType(questionType: SocraticQuestionType): void {
    this.tracker.questionType = questionType;
  }

  /**
   * Update dialogue level in tracker
   */
  updateDialogueLevel(level: DialogueLevel): void {
    this.tracker.dialogueLevel = level;
  }

  /**
   * Update cycle stage in tracker
   */
  updateCycleStage(stage: CycleStage): void {
    this.tracker.cycleStage = stage;
  }

  /**
   * Compute behavioral depth level from assessment
   */
  computeBehavioralDepthLevel(assessment: BehavioralAssessment): number {
    let level = 1; // Start at base level

    // Level 2: basic reasoning (reasoningScore >= 2)
    if (assessment.reasoningScore >= 2) {
      level = Math.max(level, 2);
    }

    // Level 3: transfer success once (transferSuccess = true)
    if (assessment.transferSuccess) {
      level = Math.max(level, 3);
    }

    // Level 4: generates quality question (reasoningScore >= 3 indicates deeper thinking)
    if (assessment.reasoningScore >= 3) {
      level = Math.max(level, 4);
    }

    // Level 5: connects cross-domain (reasoningScore >= 3 + concept bridge detected)
    // Concept bridge is indicated by depthLevelEvidence >= 4
    if (assessment.reasoningScore >= 3 && assessment.depthLevelEvidence >= 4) {
      level = Math.max(level, 5);
    }

    // Update depth tracker
    this.tracker.currentDepth = Math.max(this.tracker.currentDepth, level);
    this.tracker.maxDepthReached = Math.max(this.tracker.maxDepthReached, level);

    return level;
  }

  /**
   * Reset tracker for new session
   */
  reset(): void {
    this.tracker = {
      currentDepth: 1,
      maxDepthReached: 1,
      conceptualConnections: [],
      shouldDeepenInquiry: false,
      suggestedNextLevel: 1,
      questionType: SocraticQuestionType.CLARIFICATION,
      dialogueLevel: DialogueLevel.DIALOGUE,
      cycleStage: CycleStage.WONDER_RECEIVE
    };
  }
}

