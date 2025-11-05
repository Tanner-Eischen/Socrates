import winston from 'winston';
export declare const logger: winston.Logger;
export declare const auditLogger: winston.Logger;
export declare const performanceLogger: winston.Logger;
export declare const correlationIdMiddleware: (req: any, res: any, next: any) => void;
export declare const requestLogger: (req: any, res: any, next: any) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map