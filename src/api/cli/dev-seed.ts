import { SessionService, CreateSessionData } from '../services/SessionService';
import { logger } from '../middleware/logger';

function randomChoice<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedUserSessions(userId: string) {
  const problemTypes = ['math', 'science', 'programming', 'logic', 'language', 'other'];
  const problemPrompts: Record<string, string[]> = {
    math: [
      'Solve for x: 3x + 7 = 22',
      'Compute 12 * 8',
      'Find the derivative of x^2',
    ],
    science: [
      'Explain photosynthesis inputs and outputs',
      'Define velocity vs speed with examples',
      'What is the powerhouse of the cell?',
    ],
    programming: [
      'Write a function to reverse a string in JavaScript',
      'Explain the concept of recursion with an example',
      'What is a closure in JavaScript?',
    ],
    logic: [
      'If all A are B and all B are C, are all A C?',
      'Solve: If today is Tuesday, what day will it be in 100 days?',
      'True/False: The contrapositive of a true statement is always true',
    ],
    language: [
      'Translate: "Buenos días" to English',
      'Correct the grammar: "He don\'t like apples"',
      'Define metaphor and give an example',
    ],
    other: [
      'Describe a healthy morning routine',
      'Plan a budget for a college student',
      'Outline steps to learn a new skill effectively',
    ],
  };

  const createdSessionIds: string[] = [];

  // Create a mix of sessions for the user
  for (let i = 0; i < 8; i++) {
    const type = randomChoice(problemTypes);
    const prompt = randomChoice(problemPrompts[type]);

    const sessionData: CreateSessionData = {
      userId,
      problemText: prompt,
      problemType: type,
      difficultyLevel: randomInt(1, 5),
    };

    const session = await SessionService.create(sessionData);
    createdSessionIds.push(session.id);

    // Generate interactions with varied types
    const interactionTypes: Array<import('../services/SessionService').CreateInteractionData['type']> = [
      'question',
      'student_response',
      'enhanced_tutor_response',
      'hint',
      'feedback',
    ];

    const interactionsCount = randomInt(4, 12);
    for (let j = 0; j < interactionsCount; j++) {
      const iType = randomChoice(interactionTypes);
      const content = (() => {
        switch (iType) {
          case 'question': return `Q${j + 1}: ${prompt}`;
          case 'student_response': return `Student attempt #${j + 1}`;
          case 'enhanced_tutor_response': return `Tutor guidance #${j + 1}`;
          case 'hint': return `Hint #${j + 1}`;
          case 'feedback': return `Feedback #${j + 1}`;
          default: return `Interaction #${j + 1}`;
        }
      })();

      await SessionService.addInteraction({
        sessionId: session.id,
        userId,
        type: iType,
        content,
        metadata: {
          responseTime: randomInt(200, 2000),
          questionType: type,
          depthLevel: randomInt(1, 5),
          targetedConcepts: ['algebra', 'calculus', 'grammar', 'recursion', 'logic'].slice(0, randomInt(1, 3)),
        },
        processingTime: randomInt(50, 500),
        confidenceScore: Math.round(Math.random() * 100) / 100,
      });
    }

    // Randomly complete, pause, or leave active/abandoned to diversify analytics
    const statusRoll = randomInt(1, 100);
    if (statusRoll <= 55) {
      // Complete session with realistic duration
      const endOffsetSeconds = randomInt(60, 20 * 60); // 1–20 minutes
      const endTime = new Date(session.startTime.getTime() + endOffsetSeconds * 1000);
      await SessionService.updateStatus(session.id, 'completed', endTime);
    } else if (statusRoll <= 75) {
      await SessionService.updateStatus(session.id, 'paused');
    } else if (statusRoll <= 85) {
      // Abandoned shortly after start
      const endOffsetSeconds = randomInt(10, 60);
      const endTime = new Date(session.startTime.getTime() + endOffsetSeconds * 1000);
      await SessionService.updateStatus(session.id, 'abandoned', endTime);
    } else {
      // Keep active
      await SessionService.updateStatus(session.id, 'active');
    }
  }

  // Print summary stats for the user
  const stats = await SessionService.getSessionStats(userId);
  logger.info('Seed summary', { userId, stats });

  return createdSessionIds;
}

async function main() {
  try {
    const users = ['dev-user-123', 'demo-user', 'test-user-a', 'test-user-b'];
    for (const u of users) {
      await seedUserSessions(u);
    }

    logger.info('Dev seed completed successfully');
  } catch (err) {
    logger.error('Dev seed failed', { error: err });
    process.exitCode = 1;
  }
}

main();