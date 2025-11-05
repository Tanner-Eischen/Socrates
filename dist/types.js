"use strict";
// Enhanced type definitions for SocraTeach Day 2 & Day 3
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningStyle = exports.DifficultyLevel = exports.ProblemType = void 0;
// Enums for Day 2 features
var ProblemType;
(function (ProblemType) {
    ProblemType["ALGEBRA"] = "algebra";
    ProblemType["GEOMETRY"] = "geometry";
    ProblemType["CALCULUS"] = "calculus";
    ProblemType["ARITHMETIC"] = "arithmetic";
    ProblemType["TRIGONOMETRY"] = "trigonometry";
    ProblemType["STATISTICS"] = "statistics";
})(ProblemType || (exports.ProblemType = ProblemType = {}));
var DifficultyLevel;
(function (DifficultyLevel) {
    DifficultyLevel["BEGINNER"] = "beginner";
    DifficultyLevel["INTERMEDIATE"] = "intermediate";
    DifficultyLevel["ADVANCED"] = "advanced";
})(DifficultyLevel || (exports.DifficultyLevel = DifficultyLevel = {}));
// Day 3: Learning Style Enum
var LearningStyle;
(function (LearningStyle) {
    LearningStyle["VISUAL"] = "visual";
    LearningStyle["ANALYTICAL"] = "analytical";
    LearningStyle["EXPLORATORY"] = "exploratory";
})(LearningStyle || (exports.LearningStyle = LearningStyle = {}));
//# sourceMappingURL=types.js.map