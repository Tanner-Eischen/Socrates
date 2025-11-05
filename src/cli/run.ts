import { Command } from 'commander';
import path from 'path';
import fs from 'fs';

import { SocraticEngine } from '../socratic-engine';
import { TEST_PROBLEMS, ImageProcessor, ProblemParser } from '..';
import { renderTutorMetrics } from './util/metrics';
import { formatTutor, formatUnderstandingCheck } from './util/colors';

async function parseImageToProblemText(imagePath: string): Promise<string> {
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

  throw new Error('Unable to extract text from image.');
}

export function registerRunCommand(program: Command) {
  program
    .command('run')
    .description('One-shot tutoring prompt; prints the first tutor response and compliance')
    .option('-p, --problem <text>', 'Problem text to start with')
    .option('--problem-id <id>', 'Index into the problem bank (0-based)')
    .option('-i, --image <path>', 'Run from an image containing the problem')
    .action(async (opts) => {
      const engine = new SocraticEngine();
      engine.initializeSession(`cli-run-${Date.now()}`);
      // Difficulty is now automatically detected and adjusted by the engine

      let problemText: string | undefined;
      if (typeof opts.problemId !== 'undefined') {
        const idx = Number(opts.problemId);
        if (!Number.isNaN(idx) && TEST_PROBLEMS[idx]) problemText = TEST_PROBLEMS[idx];
      }
      if (!problemText && typeof opts.problem === 'string') {
        problemText = opts.problem;
      }
      if (!problemText && typeof opts.image === 'string') {
        const abs = path.isAbsolute(opts.image) ? opts.image : path.resolve(process.cwd(), opts.image);
        if (!fs.existsSync(abs)) throw new Error(`Image not found: ${abs}`);
        problemText = await parseImageToProblemText(abs);
      }

      if (!problemText) throw new Error('Provide --problem, --problem-id, or --image');

      const tutor = await engine.startProblem(problemText);
      const history = engine.getConversationHistory();
      const lastMsg = history[history.length - 1];
      const isCheck = lastMsg?.isUnderstandingCheck || false;
      
      // eslint-disable-next-line no-console
      console.log(isCheck ? formatUnderstandingCheck(tutor) : formatTutor(tutor));
      
      const cumulativeDirectAnswers = engine.containsDirectAnswer(tutor) ? 1 : 0;
      // eslint-disable-next-line no-console
      console.log(renderTutorMetrics(engine, tutor, cumulativeDirectAnswers, isCheck));
    });
}


