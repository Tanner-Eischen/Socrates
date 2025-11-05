import { Command } from 'commander';
import path from 'path';
import fs from 'fs';

import { SocraticEngine } from '../socratic-engine';
import { TEST_PROBLEMS } from '..';
import { renderTutorMetrics, renderStudentMetrics } from './util/metrics';
import { formatTutor, formatStudent, formatUnderstandingCheck } from './util/colors';

type DemoScript = {
  name?: string;
  problem?: string;
  problemId?: number;
  image?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced'; // Legacy, kept for script compatibility but not used
  studentProfilePath?: string;
  turns: string[];
};

function loadScript(scriptPath: string): DemoScript {
  const abs = path.isAbsolute(scriptPath) ? scriptPath : path.resolve(process.cwd(), scriptPath);
  if (!fs.existsSync(abs)) throw new Error(`Script not found: ${abs}`);
  const raw = fs.readFileSync(abs, 'utf8');
  const json = JSON.parse(raw);
  if (!Array.isArray(json.turns)) throw new Error('Script missing "turns" array');
  return json as DemoScript;
}

function resolveScenarioPath(scenario: string): string {
  const rel = `fixtures/scripts/${scenario}.json`;
  return path.resolve(process.cwd(), rel);
}

export function registerDemoCommand(program: Command) {
  program
    .command('demo')
    .description('Run a scripted demo (live tutor responses)')
    .option('--scenario <name>', 'algebra-beginner | geometry-intermediate | calculus-advanced')
    .option('--script <path>', 'Path to a demo script JSON')
    .action(async (opts) => {
      if (!opts.scenario && !opts.script) throw new Error('Provide --scenario or --script');
      const scriptPath = opts.script || resolveScenarioPath(opts.scenario);
      const script = loadScript(scriptPath);

      const engine = new SocraticEngine();
      engine.initializeSession(`cli-demo-${Date.now()}`);
      // Difficulty is now automatically detected and adjusted by the engine

      let problemText: string | undefined = undefined;
      if (typeof script.problemId === 'number' && TEST_PROBLEMS[script.problemId]) {
        problemText = TEST_PROBLEMS[script.problemId];
      }
      if (!problemText && typeof script.problem === 'string') problemText = script.problem;

      if (!problemText) throw new Error('Demo script must define problem or problemId');

      let cumulativeDirectAnswers = 0;
      
      const first = await engine.startProblem(problemText);
      const history1 = engine.getConversationHistory();
      const lastMsg1 = history1[history1.length - 1];
      const isCheck1 = lastMsg1?.isUnderstandingCheck || false;
      
      // eslint-disable-next-line no-console
      console.log(isCheck1 ? formatUnderstandingCheck(first) : formatTutor(first));
      if (engine.containsDirectAnswer(first)) cumulativeDirectAnswers++;
      // eslint-disable-next-line no-console
      console.log(renderTutorMetrics(engine, first, cumulativeDirectAnswers, isCheck1));

      for (const turn of script.turns) {
        // eslint-disable-next-line no-console
        console.log(formatStudent(turn));
        // Show student metrics before processing
        const studentMetrics = renderStudentMetrics(engine, turn);
        // eslint-disable-next-line no-console
        console.log(studentMetrics.line);
        
        const reply = await engine.respondToStudent(turn);
        const history = engine.getConversationHistory();
        const lastMsg = history[history.length - 1];
        const isCheck = lastMsg?.isUnderstandingCheck || false;
        
        // eslint-disable-next-line no-console
        console.log(isCheck ? formatUnderstandingCheck(reply) : formatTutor(reply));
        if (engine.containsDirectAnswer(reply)) cumulativeDirectAnswers++;
        // eslint-disable-next-line no-console
        console.log(renderTutorMetrics(engine, reply, cumulativeDirectAnswers, isCheck));
      }

      const analytics = engine.generateAnalytics();
      const socraticCompliance = cumulativeDirectAnswers === 0;
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
      console.log(`  Socratic Compliance: ${socraticCompliance ? '✓ PASSED' : '✗ FAILED'}`);
      
      // eslint-disable-next-line no-console
      console.log(`\n📈 Question Types Used: ${analytics.questionTypesUsed.join(', ') || 'None'}`);
    });
}


