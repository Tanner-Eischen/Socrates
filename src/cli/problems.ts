import { Command } from 'commander';
import { TEST_PROBLEMS, PROBLEM_DESCRIPTIONS } from '..';

export function registerProblemsCommand(program: Command) {
  const cmd = program
    .command('problems')
    .description('Problem bank utilities');

  cmd
    .command('list')
    .description('List available problems')
    .action(() => {
      for (let i = 0; i < TEST_PROBLEMS.length; i++) {
        // eslint-disable-next-line no-console
        console.log(`${i}. ${PROBLEM_DESCRIPTIONS?.[i] || 'Problem'} — ${TEST_PROBLEMS[i].slice(0, 80)}${TEST_PROBLEMS[i].length > 80 ? '…' : ''}`);
      }
    });

  cmd
    .command('show <id>')
    .description('Show full problem text by id')
    .action((id: string) => {
      const idx = Number(id);
      if (Number.isNaN(idx) || !TEST_PROBLEMS[idx]) {
        // eslint-disable-next-line no-console
        console.error('Invalid problem id');
        process.exit(1);
      }
      // eslint-disable-next-line no-console
      console.log(TEST_PROBLEMS[idx]);
    });
}


