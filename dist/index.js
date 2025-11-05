"use strict";
// Main entry point for SocraTeach modules
// This helps with IDE module resolution
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemParser = exports.ProblemClassifier = exports.ImageProcessor = exports.LocalStorageManager = exports.StudyPlanner = exports.AnalyticsEngine = exports.SessionManager = exports.AdaptiveController = exports.PROBLEM_DESCRIPTIONS = exports.TEST_PROBLEMS = exports.SocraticEngine = void 0;
// Core engine exports
var socratic_engine_1 = require("./socratic-engine");
Object.defineProperty(exports, "SocraticEngine", { enumerable: true, get: function () { return socratic_engine_1.SocraticEngine; } });
// Type definitions
__exportStar(require("./types"), exports);
// Problem bank
var problem_bank_1 = require("./problem-bank");
Object.defineProperty(exports, "TEST_PROBLEMS", { enumerable: true, get: function () { return problem_bank_1.TEST_PROBLEMS; } });
Object.defineProperty(exports, "PROBLEM_DESCRIPTIONS", { enumerable: true, get: function () { return problem_bank_1.PROBLEM_DESCRIPTIONS; } });
// Controllers and managers
var adaptive_controller_1 = require("./adaptive-controller");
Object.defineProperty(exports, "AdaptiveController", { enumerable: true, get: function () { return adaptive_controller_1.AdaptiveController; } });
var session_manager_1 = require("./session-manager");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return session_manager_1.SessionManager; } });
var analytics_engine_1 = require("./analytics-engine");
Object.defineProperty(exports, "AnalyticsEngine", { enumerable: true, get: function () { return analytics_engine_1.AnalyticsEngine; } });
var study_planner_1 = require("./study-planner");
Object.defineProperty(exports, "StudyPlanner", { enumerable: true, get: function () { return study_planner_1.StudyPlanner; } });
// Data and storage
var data_storage_1 = require("./data-storage");
Object.defineProperty(exports, "LocalStorageManager", { enumerable: true, get: function () { return data_storage_1.LocalStorageManager; } });
// Processing utilities
var image_processor_1 = require("./image-processor");
Object.defineProperty(exports, "ImageProcessor", { enumerable: true, get: function () { return image_processor_1.ImageProcessor; } });
var problem_classifier_1 = require("./problem-classifier");
Object.defineProperty(exports, "ProblemClassifier", { enumerable: true, get: function () { return problem_classifier_1.ProblemClassifier; } });
var problem_parser_1 = require("./problem-parser");
Object.defineProperty(exports, "ProblemParser", { enumerable: true, get: function () { return problem_parser_1.ProblemParser; } });
//# sourceMappingURL=index.js.map