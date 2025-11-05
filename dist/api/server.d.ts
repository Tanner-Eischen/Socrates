import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
export declare let dbPool: any;
export declare let redisClient: any;
export declare let cacheService: any;
export declare let sessionService: any;
export declare let io: SocketIOServer;
declare class SocraTeachServer {
    private app;
    private server;
    private io;
    private isShuttingDown;
    constructor();
    private initializeServices;
    private setupMiddleware;
    private setupRoutes;
    private setupWebSocket;
    start(): Promise<void>;
    private setupGracefulShutdown;
    getApp(): express.Application;
    getServer(): any;
    getIO(): SocketIOServer;
}
declare const server: SocraTeachServer;
export default server;
export { SocraTeachServer };
//# sourceMappingURL=server.d.ts.map