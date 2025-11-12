/**
 * Question Selector Module
 * Handles selection of appropriate Socratic question types based on context
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
    previousQuestionType: SocraticQuestionType
  ): SocraticQuestionType {
    // If struggling, return to clarification
    if (assessment.confidenceLevel < 0.2) {
      return SQT.CLARIFICATION;
    }
    
    // If ready to advance, use more advanced types
    if (assessment.readinessForAdvancement) {
      return this.selectNextQuestionType(assessment);
    }
    
    // Otherwise, continue with similar or slightly advanced question
    return previousQuestionType;
  }
}

