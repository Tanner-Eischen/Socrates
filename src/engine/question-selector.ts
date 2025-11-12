/**
 * Question Selector Module
 * Handles selection of appropriate Socratic question types based on context
 * Updated: 2025-01-12 - Added recentQuestionTypes parameter
 */

import type { SocraticQuestionType, SocraticAssessment } from './types';
import { SocraticQuestionType as SQT } from './types';

export class QuestionSelector {
  /**
   * Select initial question type based on problem characteristics
   */
  selectInitialQuestionType(problem: string): SocraticQuestionType {
    if (problem.includes('solve') || problem.includes('find')) {
      return SQT.CLARIFICATION;
    }
    if (problem.includes('why') || problem.includes('explain')) {
      return SQT.EVIDENCE;
    }
    if (problem.includes('compare') || problem.includes('evaluate')) {
      return SQT.PERSPECTIVE;
    }
    return SQT.CLARIFICATION;
  }

  /**
   * Select next question type based on student assessment
   */
  selectNextQuestionType(assessment: SocraticAssessment): SocraticQuestionType {
    // Low confidence: use clarification or assumptions
    if (assessment.confidenceLevel < 0.3) {
      return Math.random() < 0.7 ? SQT.CLARIFICATION : SQT.ASSUMPTIONS;
    }
    
    // Medium confidence: use evidence-based questions
    if (assessment.confidenceLevel < 0.7) {
      return SQT.EVIDENCE;
    }
    
    // High confidence: use advanced questioning types
    const advancedTypes = [SQT.IMPLICATIONS, SQT.PERSPECTIVE, SQT.META_QUESTIONING];
    return advancedTypes[Math.floor(Math.random() * advancedTypes.length)];
  }

  /**
   * Select question type for understanding checks
   */
  selectUnderstandingCheckQuestionType(assessment: SocraticAssessment): SocraticQuestionType {
    // High confidence: test with evidence questions
    if (assessment.confidenceLevel > 0.7) {
      return SQT.EVIDENCE; // Test if they can support their understanding
    }
    
    // Low confidence: use clarification
    if (assessment.confidenceLevel < 0.4) {
      return SQT.CLARIFICATION; // Check basic understanding
    }
    
    // Medium confidence: test deeper understanding
    if (assessment.depthOfThinking >= 3) {
      return SQT.IMPLICATIONS; // Test deeper understanding
    }
    
    return SQT.EVIDENCE;
  }

  /**
   * Select contextual question type based on assessment and previous question type
   */
  selectContextualQuestionType(
    assessment: SocraticAssessment,
    previousQuestionType: SocraticQuestionType,
    recentQuestionTypes?: SocraticQuestionType[]
  ): SocraticQuestionType {
    // If struggling, return to clarification
    if (assessment.confidenceLevel < 0.2) {
      // Avoid repeating clarification if we just asked it
      if (previousQuestionType === SQT.CLARIFICATION && recentQuestionTypes?.slice(-2).every(qt => qt === SQT.CLARIFICATION)) {
        return SQT.ASSUMPTIONS; // Try assumptions instead
      }
      return SQT.CLARIFICATION;
    }
    
    // If ready to advance, use more advanced types
    if (assessment.readinessForAdvancement) {
      return this.selectNextQuestionType(assessment);
    }
    
    // Avoid repeating the same question type immediately
    // Check if we've asked the same type in the last 2 questions
    if (recentQuestionTypes && recentQuestionTypes.length >= 2) {
      const lastTwo = recentQuestionTypes.slice(-2);
      if (lastTwo.every(qt => qt === previousQuestionType)) {
        // We've repeated this type twice - try a different approach
        if (previousQuestionType === SQT.CLARIFICATION) {
          return SQT.EVIDENCE;
        } else if (previousQuestionType === SQT.EVIDENCE) {
          return SQT.ASSUMPTIONS;
        } else {
          return SQT.CLARIFICATION; // Return to basics
        }
      }
    }
    
    // Progress through question types systematically
    const typeOrder = [
      SQT.CLARIFICATION,
      SQT.ASSUMPTIONS,
      SQT.EVIDENCE,
      SQT.PERSPECTIVE,
      SQT.IMPLICATIONS,
      SQT.META_QUESTIONING
    ];
    
    const currentIndex = typeOrder.indexOf(previousQuestionType);
    const nextIndex = (currentIndex + 1) % typeOrder.length;
    
    // Don't jump too far ahead - only advance one step at a time
    return typeOrder[nextIndex];
  }
}

