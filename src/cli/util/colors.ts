// ANSI color codes for terminal output

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

/**
 * Colorize tutor dialogue in green
 */
export function tutorColor(text: string): string {
  return `${GREEN}${text}${RESET}`;
}

/**
 * Colorize student dialogue in yellow
 */
export function studentColor(text: string): string {
  return `${YELLOW}${text}${RESET}`;
}

/**
 * Format tutor message with green color
 */
export function formatTutor(message: string): string {
  return tutorColor(`Tutor: ${message}`);
}

/**
 * Format student message with yellow color
 */
export function formatStudent(message: string): string {
  return studentColor(`Student: ${message}`);
}

/**
 * Colorize understanding check dialogue in cyan
 */
export function understandingCheckColor(text: string): string {
  return `${CYAN}${text}${RESET}`;
}

/**
 * Format understanding check message with cyan color
 */
export function formatUnderstandingCheck(message: string): string {
  return understandingCheckColor(`Tutor: ${message}`);
}

