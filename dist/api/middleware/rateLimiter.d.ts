import { Request, Response, NextFunction } from 'express';
export declare const rateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const voiceRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const analyticsRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const burstRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const progressiveRateLimiter: (basePoints?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export default rateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map