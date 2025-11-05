"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const environment_1 = require("../environment");
describe('environment config', () => {
    it('is in test mode when run by Jest', () => {
        // Jest sets NODE_ENV=test; ensure our helper reflects that
        expect((0, environment_1.isTest)()).toBe(true);
    });
    it('loads port from .env', () => {
        // Ensures dotenv is applied and our .env is honored
        expect(environment_1.config.PORT).toBe(3333);
    });
});
//# sourceMappingURL=environment.test.js.map