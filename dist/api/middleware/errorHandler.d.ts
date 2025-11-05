import { Request, Response, NextFunction } from 'express';
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}
export declare class ValidationError extends Error {
    details?: any | undefined;
    statusCode: number;
    code: string;
    constructor(message: string, details?: any | undefined);
}
export declare class AuthenticationError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class AuthorizationError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class NotFoundError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class ConflictError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class RateLimitError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class InternalServerError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class ServiceUnavailableError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare const errorHandler: (err: ApiError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const createValidationError: (message: string, details?: any) => ValidationError;
export default errorHandler;
//# sourceMappingURL=errorHandler.d.ts.map