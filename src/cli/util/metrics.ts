import { SocraticEngine, SocraticQuestionType, DifficultyLevel } from '../../socratic-engine';

interface TutorMetrics {
  questionType: string;
  depthCurrent: number;
  depthMax: number;
  difficulty: string;
  compliance: 'PASS' | 'FAIL';
  conceptsCount: number;
  strugglingTurns: number;
  cumulativeTurns: number;
  cumulativeTypes: number;
  cumulativeDirectAnswers: number;
  avgDepth: number;
}

interface StudentMetrics {
  confidence: number;
  struggling: boolean;
  ready: boolean;
  depth: number;
  misconceptions: number;
  concepts: string[];
}

// Helper to assess student response (replicates engine logic for CLI use)
function assessStudentInput(input: string): {
  confidence: number;
  struggling: boolean;
  ready: boolean;
  misconceptions: number;
  depth: number;
  concepts: string[];
} {
  const uncertaintyIndicators = [
    /i don't know/i, /not sure/i, /confused/i, /don't understand/i
  ];
  
  const confidenceIndicators = [
    /i'm sure/i, /definitely/i, /certainly/i, /obviously/i
  ];

  const misconceptionIndicators = [
    /always/i, /never/i, /every time/i
  ];

  let confidence = 0.5;
  if (uncertaintyIndicators.some(p => p.test(input))) {
    confidence = 0.2;
  } else if (confidenceIndicators.some(p => p.test(input))) {
    confidence = 0.9;
  } else if (/maybe|perhaps|might|could/i.test(input)) {
    confidence = 0.6;
  }

  const misconceptions = misconceptionIndicators.filter(p => p.test(input)).length;
  const struggling = confidence < 0.3 || misconceptions > 0;
  const ready = confidence > 0.6 && misconceptions === 0;

  // Simple depth assessment
  let depth = 1;
  if (input.length > 50) depth++;
  if (/because|since|therefore|so that/i.test(input)) depth++;
  if (/if.*then|when.*then/i.test(input)) depth++;
  if (/similar to|different from|like|unlike/i.test(input)) depth++;
  if (/what if|suppose|imagine/i.test(input)) depth++;
  depth = Math.min(depth, 5);

  // Extract concepts (simple pattern matching)
  const conceptTerms = ['algebra', 'geometry', 'calculus', 'arithmetic', 'fraction', 'equation', 'variable', 'derivative', 'integral'];
  const concepts = conceptTerms.filter(term => new RegExp(`\\b${term}\\b`, 'i').test(input));

  return { confidence, struggling, ready, misconceptions, depth, concepts };
}

export function renderTutorMetrics(
  engine: SocraticEngine,
  tutorResponse: string,
  cumulativeDirectAnswers: number,
  isUnderstandingCheck?: boolean
): string {
  const questionTypes = engine.getQuestionTypeSequence();
  const lastQuestionType = questionTypes[questionTypes.length - 1] || 'unknown';
  
  const parts: string[] = [];
  
  // Only show direct answer violation if flagged
  const hasDirectAnswer = engine.containsDirectAnswer(tutorResponse);
  if (hasDirectAnswer) {
    parts.push(`[✗ DIRECT ANSWER]`);
  }
  
  // Only show understanding check flag if it's an understanding check
  if (isUnderstandingCheck) {
    parts.push(`[UNDERSTANDING CHECK]`);
  }

  // Only return something if there are flags to show
  return parts.length > 0 ? parts.join(' ') : '';
}

export function renderStudentMetrics(
  engine: SocraticEngine,
  studentInput: string
): { line: string; assessment: StudentMetrics } {
  const assessment = assessStudentInput(studentInput);
  const depthTracker = engine.getDepthTracker();
  
  const parts: string[] = [];
  
  // Only show struggling flag if student is actually struggling
  if (assessment.struggling) {
    parts.push(`[⚠️  STRUGGLING]`);
  }
  
  // Only show ready flag if student is ready (and not struggling)
  if (assessment.ready && !assessment.struggling) {
    parts.push(`[✓ READY]`);
  }
  
  // Only show misconceptions if there are any
  if (assessment.misconceptions > 0) {
    parts.push(`[⚠️  ${assessment.misconceptions} MISCONCEPTION${assessment.misconceptions > 1 ? 'S' : ''}]`);
  }

  // Only return something if there are flags to show
  return {
    line: parts.length > 0 ? parts.join(' ') : '',
    assessment: {
      confidence: assessment.confidence,
      struggling: assessment.struggling,
      ready: assessment.ready,
      misconceptions: assessment.misconceptions,
      depth: assessment.depth,
      concepts: assessment.concepts
    }
  };
}

