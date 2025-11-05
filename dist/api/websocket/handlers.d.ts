import { Server as SocketIOServer, Socket } from 'socket.io';
export interface AuthenticatedSocket extends Socket {
    userId?: string;
    userRole?: string;
    roomId?: string;
}
export interface SocketMessage {
    type: string;
    payload: any;
    timestamp: Date;
}
export interface JoinRoomData {
    collaborationSessionId: string;
    role: 'tutor' | 'student' | 'observer';
}
export interface SendMessageData {
    collaborationSessionId: string;
    type: 'text' | 'voice' | 'image' | 'system';
    content: string;
    metadata?: Record<string, any>;
}
export interface VoiceData {
    collaborationSessionId: string;
    audioData: string;
    language?: string;
}
export interface ScreenShareData {
    collaborationSessionId: string;
    action: 'start' | 'stop';
    streamId?: string;
}
export declare class WebSocketHandlers {
    private io;
    constructor(io: SocketIOServer);
    /**
     * Setup WebSocket middleware
     */
    private setupMiddleware;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Handle joining a collaboration room
     */
    private handleJoinRoom;
    /**
     * Handle leaving a collaboration room
     */
    private handleLeaveRoom;
    /**
     * Handle sending a message
     */
    private handleSendMessage;
    /**
     * Handle voice message
     */
    private handleVoiceMessage;
    /**
     * Handle screen sharing
     */
    private handleScreenShare;
    /**
     * Handle typing indicator
     */
    private handleTyping;
    /**
     * Handle cursor position updates
     */
    private handleCursorPosition;
    /**
     * Handle client disconnect
     */
    private handleDisconnect;
    /**
     * Track analytics event
     */
    private trackEvent;
    /**
     * Broadcast system message to a room
     */
    broadcastSystemMessage(roomId: string, message: string, metadata?: Record<string, any>): void;
    /**
     * Get room statistics
     */
    getRoomStats(roomId: string): {
        participantCount: number;
        participants: string[];
    };
    /**
     * Send message to specific user
     */
    sendToUser(userId: string, event: string, data: any): void;
    /**
     * Get connected users count
     */
    getConnectedUsersCount(): number;
    /**
     * Get active rooms
     */
    getActiveRooms(): string[];
}
export default WebSocketHandlers;
//# sourceMappingURL=handlers.d.ts.map