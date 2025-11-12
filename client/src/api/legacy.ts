/**
 * Legacy API Exports
 * Temporary compatibility layer during migration
 * TODO: Remove once all components are migrated to use services
 */

import { problemsService } from './services/problems.service';
import { sessionsService } from './services/sessions.service';

// Re-export for backward compatibility
export const submitProblemText = async (problemText: string) => {
  return problemsService.submitText({ problemText });
};

export const submitProblemImage = async (imageFile: File) => {
  return problemsService.submitImage({ problemImage: imageFile });
};

export const getSessionJourney = sessionsService.getJourney;
export const getSessionReport = sessionsService.getReport;

