import { Command } from 'commander';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

import { SocraticEngine } from '../socratic-engine';
import { ImageProcessor, ProblemParser, TEST_PROBLEMS } from '..';
import { renderTutorMetrics, renderStudentMetrics } from './util/metrics';
import { formatTutor, formatStudent, formatUnderstandingCheck } from './util/colors';

type StudentProfile = any; // Use relaxed typing to avoid coupling

async function parseImageToProblemText(imagePath: string): Promise<string> {
  // Attempt multiple fallbacks to accommodate existing API shapes
  try {
    const parser = new (ProblemParser as unknown as { new(): any })();
    if (typeof (parser as any).parseImageToText === 'function') {
      return await (parser as any).parseImageToText(imagePath);
    }
    if (typeof (parser as any).parse === 'function') {
      const res = await (parser as any).parse(imagePath);
      if (typeof res === 'string') return res;
      if (res && typeof res.text === 'string') return res.text;
    }
  } catch (_) {}

  try {
    const proc = new (ImageProcessor as unknown as { new(): any })();
    if (typeof (proc as any).extractText === 'function') {
      return await (proc as any).extractText(imagePath);
    }
    if (typeof (proc as any).process === 'function') {
      const out = await (proc as any).process(imagePath);
      if (typeof out === 'string') return out;
      if (out && typeof out.text === 'string') return out.text;
    }
  } catch (_) {}

  throw new Error('Unable to extract text from image. Please provide the problem text.');
}

function loadStudentProfile(profilePath?: string): StudentProfile | undefined {
  if (!profilePath) return undefined;
  const abs = path.isAbsolute(profilePath) ? profilePath : path.resolve(process.cwd(), profilePath);
  if (!fs.existsSync(abs)) throw new Error(`Student profile not found: ${abs}`);
  const raw = fs.readFileSync(abs, 'utf8');
  return JSON.parse(raw);
}

export function registerChatCommand(program: Command) {
  program
    .command('chat')
    .description('Interactive Socratic tutoring session (text + image)')
    .option('-p, --problem <text>', 'Problem text to start with')
    .option('--problem-id <id>', 'Index into the problem bank (0-based)')
    .option('-i, --image <path>', 'Start from an image containing the problem')
    .option('-s, --student <path>', 'JSON student profile file')
    .action(async (opts) => {
      const engine = new SocraticEngine();
      const sessionId = `cli-${Date.now()}`;
      const student = loadStudentProfile(opts.student);
      engine.initializeSession(sessionId, student);

      let problemText: string | undefined = undefined;

      if (typeof opts.problemId !== 'undefined') {
        const idx = Number(opts.problemId);
        if (!Number.isNaN(idx) && TEST_PROBLEMS[idx]) problemText = TEST_PROBLEMS[idx];
      }
      if (!problemText && typeof opts.problem === 'string') {
        problemText = opts.problem;
      }
      if (!problemText && typeof opts.image === 'string') {
        problemText = await parseImageToProblemText(opts.image);
      }

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

      try {
        if (!problemText) {
          // Prompt for a starting problem
          const entered = await ask('Enter a problem to start: ');
          problemText = entered?.trim();
        }

        if (!problemText) {
          // eslint-disable-next-line no-console
          console.error('No problem provided. Exiting.');
          rl.close();
          process.exit(1);
        }

        let cumulativeDirectAnswers = 0;
        
        const tutor = await engine.startProblem(problemText);
        const history = engine.getConversationHistory();
        const lastMessage = history[history.length - 1];
        const isCheck = lastMessage?.isUnderstandingCheck || false;
        
        // eslint-disable-next-line no-console
        console.log(isCheck ? formatUnderstandingCheck(tutor) : formatTutor(tutor));
        if (engine.containsDirectAnswer(tutor)) cumulativeDirectAnswers++;
        const tutorMetrics = renderTutorMetrics(engine, tutor, cumulativeDirectAnswers, isCheck);
        if (tutorMetrics) {
          // eslint-disable-next-line no-console
          console.log(tutorMetrics);
        }

        // Chat loop
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const line = await ask('You: ');
          const input = (line || '').trim();
          if (!input) continue;

          if (input === ':quit' || input === ':q') {
            // Display end-of-interaction assessment
            const analytics = engine.generateAnalytics();
            const understandingChecks = engine.getUnderstandingCheckInfo();
            const difficulty = engine.getCurrentDifficulty();
            const sessionPerf = engine.getSessionPerformance();
            
            // eslint-disable-next-line no-console
            console.log('\n=== End of Interaction Assessment ===');
            // eslint-disable-next-line no-console
            console.log(`\n📊 Learning Progress:`);
            // eslint-disable-next-line no-console
            console.log(`  Difficulty Level: ${difficulty} (auto-detected)`);
            // eslint-disable-next-line no-console
            console.log(`  Concepts Explored: ${analytics.conceptsExplored.join(', ') || 'None yet'}`);
            // eslint-disable-next-line no-console
            console.log(`  Average Depth: ${analytics.averageDepth.toFixed(1)}/5`);
            // eslint-disable-next-line no-console
            console.log(`  Total Interactions: ${analytics.totalInteractions}`);
            
            // eslint-disable-next-line no-console
            console.log(`\n✅ Understanding Checks:`);
            // eslint-disable-next-line no-console
            console.log(`  Checks Performed: ${understandingChecks.count}`);
            if (understandingChecks.count > 0) {
              // eslint-disable-next-line no-console
              console.log(`  Average Confidence After Checks: ${(understandingChecks.averageConfidenceAfterCheck * 100).toFixed(0)}%`);
            }
            
            // eslint-disable-next-line no-console
            console.log(`\n⚠️  Flags:`);
            if (cumulativeDirectAnswers > 0) {
              // eslint-disable-next-line no-console
              console.log(`  ✗ Direct Answers Detected: ${cumulativeDirectAnswers}`);
            }
            // eslint-disable-next-line no-console
            console.log(`  Socratic Compliance: ${cumulativeDirectAnswers === 0 ? '✓ PASSED' : '✗ FAILED'}`);
            
            // eslint-disable-next-line no-console
            console.log(`\n📈 Question Types Used: ${analytics.questionTypesUsed.join(', ') || 'None'}`);
            
            rl.close();
            break;
          }

          if (input.startsWith(':attach ')) {
            const pth = input.substring(':attach '.length).trim();
            try {
              const extracted = await parseImageToProblemText(pth);
              // Show student metrics for the image input (only if there are flags)
              const studentMetrics = renderStudentMetrics(engine, `Image context: ${extracted}`);
              if (studentMetrics.line) {
                // eslint-disable-next-line no-console
                console.log(studentMetrics.line);
              }
              
              const tutorResp = await engine.respondToStudent(`Image context: ${extracted}`);
              const history = engine.getConversationHistory();
              const lastMsg = history[history.length - 1];
              const isCheck = lastMsg?.isUnderstandingCheck || false;
              
              // eslint-disable-next-line no-console
              console.log(isCheck ? formatUnderstandingCheck(tutorResp) : formatTutor(tutorResp));
              if (engine.containsDirectAnswer(tutorResp)) cumulativeDirectAnswers++;
              const tutorMetrics = renderTutorMetrics(engine, tutorResp, cumulativeDirectAnswers, isCheck);
              if (tutorMetrics) {
                // eslint-disable-next-line no-console
                console.log(tutorMetrics);
              }
            } catch (e: any) {
              // eslint-disable-next-line no-console
              console.error(e?.message || String(e));
            }
            continue;
          }

          // Show student metrics before processing (only if there are flags)
          const studentMetrics = renderStudentMetrics(engine, input);
          if (studentMetrics.line) {
            // eslint-disable-next-line no-console
            console.log(studentMetrics.line);
          }

          const tutorResp = await engine.respondToStudent(input);
          const history = engine.getConversationHistory();
          const lastMsg = history[history.length - 1];
          const isCheck = lastMsg?.isUnderstandingCheck || false;
          
          // eslint-disable-next-line no-console
          console.log(isCheck ? formatUnderstandingCheck(tutorResp) : formatTutor(tutorResp));
          if (engine.containsDirectAnswer(tutorResp)) cumulativeDirectAnswers++;
          const tutorMetrics = renderTutorMetrics(engine, tutorResp, cumulativeDirectAnswers, isCheck);
          if (tutorMetrics) {
            // eslint-disable-next-line no-console
            console.log(tutorMetrics);
          }
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(err?.message || err);
        rl.close();
        process.exit(1);
      }
    });
}


