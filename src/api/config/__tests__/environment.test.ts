import { config, isTest } from '../environment';

describe('environment config', () => {
  it('is in test mode when run by Jest', () => {
    // Jest sets NODE_ENV=test; ensure our helper reflects that
    expect(isTest()).toBe(true);
  });

  it('loads port from .env', () => {
    // Ensures dotenv is applied and our .env is honored
    expect(config.PORT).toBe(3333);
  });
});