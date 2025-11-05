import { Command } from 'commander';
import path from 'path';

// Load env for OpenAI key, etc.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch (_e) {}

import { registerChatCommand } from './chat';
import { registerRunCommand } from './run';
import { registerDemoCommand } from './demo';
import { registerProblemsCommand } from './problems';

const program = new Command();

program
  .name('tutor')
  .description('Socratic tutoring CLI (live, text + image)')
  .version('0.1.0');

registerChatCommand(program);
registerRunCommand(program);
registerDemoCommand(program);
registerProblemsCommand(program);

program.parseAsync(process.argv).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || err);
  process.exit(1);
});


