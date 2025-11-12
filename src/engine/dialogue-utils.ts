/**
 * Dialogue Utilities Module
 * Helper functions for dialogue level and cycle stage computation
 */

import type { SocraticQuestionType, DialogueLevel, CycleStage } from './types';
import { DialogueLevel as DL, CycleStage as CS, SocraticQuestionType as SQT } from './types';

/**
 * Determine dialogue level from question type and context
 */
export function computeDialogueLevel(
  qt: SocraticQuestionType,
  isUnderstandingCheck?: boolean
): DialogueLevel {
  if (qt === SQT.META_QUESTIONING || isUnderstandingCheck) {
    return DL.META_DISCOURSE;
  }
  if (
    qt === SQT.CLARIFICATION ||
    qt === SQT.ASSUMPTIONS ||
    qt === SQT.EVIDENCE ||
    qt === SQT.PERSPECTIVE ||
    qt === SQT.IMPLICATIONS
  ) {
    return DL.STRATEGIC_DISCOURSE;
  }
  return DL.DIALOGUE;
}

/**
 * Determine Socratic cycle stage for the tutor's current turn
 */
export function computeCycleStage(
  qt: SocraticQuestionType,
  isUnderstandingCheck?: boolean,
  initial?: boolean
): CycleStage {
  if (initial) return CS.WONDER_RECEIVE;
  if (isUnderstandingCheck) return CS.RESTATE;
  if (
    qt === SQT.CLARIFICATION ||
    qt === SQT.ASSUMPTIONS ||
    qt === SQT.EVIDENCE ||
    qt === SQT.PERSPECTIVE ||
    qt === SQT.IMPLICATIONS
  ) {
    return CS.REFINE_CROSS_EXAMINE;
  }
  if (qt === SQT.META_QUESTIONING) {
    return CS.REFLECT;
  }
  return CS.REPEAT;
}

