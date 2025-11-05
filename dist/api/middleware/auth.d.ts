import { Request, RequestHandler } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        name: string;
    };
}
export interface JWTPayload {
    id: string;
    email: string;
    role: string;
    name: string;
    iat?: number;
    exp?: number;
}
export declare const generateToken: (payload: Omit<JWTPayload, "iat" | "exp">) => string;
export declare const generateRefreshToken: (payload: Omit<JWTPayload, "iat" | "exp">) => string;
export declare const verifyToken: (token: string) => JWTPayload;
export declare const authMiddleware: RequestHandler;
export declare const optionalAuthMiddleware: RequestHandler;
export declare const requireRole: (roles: string | string[]) => RequestHandler;
export declare const requireAdmin: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const requireTutorOrAdmin: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const requireOwnership: (userIdParam?: string) => RequestHandler;
export default authMiddleware;
export declare const authenticate: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map