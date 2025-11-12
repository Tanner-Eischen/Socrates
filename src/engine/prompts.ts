/**
 * Prompt Management Module
 * Handles metacognitive prompts and conceptual framework
 */

import type { SocraticQuestionType } from './types';

export class PromptManager {
  private metacognitivePrompts: Map<string, string[]>;
  private conceptualFramework: Map<string, string[]>;

  constructor() {
    this.metacognitivePrompts = new Map();
    this.conceptualFramework = new Map();
    this.initializeMetacognitivePrompts();
    this.initializeConceptualFramework();
  }

  private initializeMetacognitivePrompts(): void {
    this.metacognitivePrompts = new Map([
      ['processReflection', [
        "How did you decide to take that approach?",
        "What was your thinking process here?",
        "What made you choose this method?"
      ]],
      ['confidenceCheck', [
        "How confident are you in this answer? What makes you feel that way?",
        "On a scale of 1-10, how sure are you about this step?",
        "What part of this solution feels most solid to you?"
      ]],
      ['strategyAwareness', [
        "What strategy are you using here? Have you used it before?",
        "Is this approach similar to problems you've solved before?",
        "What other methods could work for this problem?"
      ]],
      ['errorAnalysis', [
        "What do you think might have led to this mistake?",
        "If you were to start over, what would you do differently?",
        "What could help you avoid this error next time?"
      ]]
    ]);
  }

  private initializeConceptualFramework(): void {
    this.conceptualFramework = new Map([
      ['algebra', ['variables', 'equations', 'solving', 'substitution', 'elimination']],
      ['geometry', ['shapes', 'area', 'perimeter', 'angles', 'theorems']],
      ['calculus', ['derivatives', 'integrals', 'limits', 'rates', 'optimization']],
      ['statistics', ['mean', 'median', 'distribution', 'probability', 'correlation']],
      ['arithmetic', ['addition', 'subtraction', 'multiplication', 'division']],
      ['fractions', ['numerator', 'denominator', 'equivalent', 'simplify']]
    ]);
  }

  getMetacognitivePrompt(category: string): string {
    const prompts = this.metacognitivePrompts.get(category);
    if (!prompts || prompts.length === 0) {
      return "Can you tell me more about your thinking?";
    }
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  getConceptualFramework(domain: string): string[] {
    return this.conceptualFramework.get(domain) || [];
  }

  getAllDomains(): string[] {
    return Array.from(this.conceptualFramework.keys());
  }
}

