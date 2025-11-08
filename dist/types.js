"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocraticQuestionType = exports.DifficultyLevel = exports.ProblemType = void 0;
// Problem Type Enum
var ProblemType;
(function (ProblemType) {
    ProblemType["ALGEBRA"] = "algebra";
    ProblemType["GEOMETRY"] = "geometry";
    ProblemType["CALCULUS"] = "calculus";
    ProblemType["STATISTICS"] = "statistics";
    ProblemType["TRIGONOMETRY"] = "trigonometry";
    ProblemType["ARITHMETIC"] = "arithmetic";
})(ProblemType || (exports.ProblemType = ProblemType = {}));
// Difficulty Level Enum
var DifficultyLevel;
(function (DifficultyLevel) {
    DifficultyLevel["BEGINNER"] = "beginner";
    DifficultyLevel["INTERMEDIATE"] = "intermediate";
    DifficultyLevel["ADVANCED"] = "advanced";
})(DifficultyLevel || (exports.DifficultyLevel = DifficultyLevel = {}));
// Enhanced Socratic Question Types
var SocraticQuestionType;
(function (SocraticQuestionType) {
    SocraticQuestionType["CLARIFICATION"] = "clarification";
    SocraticQuestionType["ASSUMPTIONS"] = "assumptions";
    SocraticQuestionType["EVIDENCE"] = "evidence";
    SocraticQuestionType["PERSPECTIVE"] = "perspective";
    SocraticQuestionType["IMPLICATIONS"] = "implications";
    SocraticQuestionType["META_QUESTIONING"] = "meta_questioning"; // "Why is this question important?"
})(SocraticQuestionType || (exports.SocraticQuestionType = SocraticQuestionType = {}));
//# sourceMappingURL=types.js.map