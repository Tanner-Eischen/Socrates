/**
 * Student Assessor Module
 * Handles assessment of student responses and understanding
 */

import type { SocraticAssessment } from './types';

export class StudentAssessor {
  /**
   * Assess student response to determine confidence, misconceptions, and understanding
   */
  assessStudentResponse(response: string): SocraticAssessment {
    const uncertaintyIndicators = [
      /i don't know/i, 
      /not sure/i, 
      /confused/i, 
      /don't understand/i,
      /i need help/i,
      /help me/i,
      /stuck/i,
      /lost/i,
      /no idea/i,
      /can't figure/i,
      /don't get it/i
    ];
    
    const confidenceIndicators = [
      /i'm sure/i, 
      /definitely/i, 
      /certainly/i, 
      /obviously/i,
      /i know/i,
      /i think i got it/i,
      /that makes sense/i
    ];

    const misconceptionIndicators = [
      /always/i, /never/i, /every time/i // Overgeneralization
    ];

    let confidenceLevel = 0.5; // Default moderate confidence
    
    // Adjust confidence based on language
    if (uncertaintyIndicators.some(pattern => pattern.test(response))) {
      confidenceLevel = 0.2;
    } else if (confidenceIndicators.some(pattern => pattern.test(response))) {
      confidenceLevel = 0.9;
    } else if (/maybe|perhaps|might|could|guess|think so/i.test(response)) {
      confidenceLevel = 0.6;
    }
    
    // Lower confidence if response is very short (likely struggling)
    if (response.trim().length < 10 && !confidenceIndicators.some(pattern => pattern.test(response))) {
      confidenceLevel = Math.min(confidenceLevel, 0.4);
    }

    const misconceptions = misconceptionIndicators
      .filter(pattern => pattern.test(response))
      .map(() => 'Potential overgeneralization detected');

    return {
      confidenceLevel,
      misconceptions,
      readinessForAdvancement: confidenceLevel > 0.6 && misconceptions.length === 0,
      conceptualUnderstanding: this.assessConceptualUnderstanding(response),
      depthOfThinking: this.assessThinkingDepth(response)
    };
  }

  /**
   * Assess conceptual understanding from response (1-5 scale)
   */
  assessConceptualUnderstanding(response: string): number {
    // Simple heuristic: longer, more detailed responses suggest better understanding
    const length = response.trim().length;
    const hasExplanation = /because|since|therefore|so|means|indicates/i.test(response);
    const hasExamples = /for example|like|such as|instance/i.test(response);
    
    let score = 1;
    if (length > 50) score = 2;
    if (length > 100 && hasExplanation) score = 3;
    if (length > 150 && hasExplanation && hasExamples) score = 4;
    if (length > 200 && hasExplanation && hasExamples && /connect|relate|similar/i.test(response)) score = 5;
    
    return Math.min(5, Math.max(1, score));
  }

  /**
   * Assess depth of thinking from response (1-5 scale)
   */
  assessThinkingDepth(response: string): number {
    const depthIndicators = [
      /why|how|what if|suppose|assume/i, // Questioning
      /because|since|therefore|thus|consequently/i, // Reasoning
      /compare|contrast|similar|different|relate/i, // Analysis
      /pattern|trend|general|specific|example/i, // Abstraction
      /verify|check|test|prove|validate/i // Evaluation
    ];
    
    const matches = depthIndicators.filter(pattern => pattern.test(response)).length;
    return Math.min(5, Math.max(1, matches + 1));
  }

  /**
   * Extract concepts from text
   */
  extractConcepts(text: string, conceptualFramework: Map<string, string[]>): string[] {
    const concepts: string[] = [];
    
    for (const category of conceptualFramework.keys()) {
      const terms = conceptualFramework.get(category) || [];
      if (terms.some(term => new RegExp(`\\b${term}\\b`, 'i').test(text))) {
        concepts.push(category);
      }
    }
    
    return [...new Set(concepts)];
  }
}

