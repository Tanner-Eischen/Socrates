import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../middleware/logger';
import { CollaborationService } from '../services/CollaborationService';
import { AnalyticsService } from '../services/AnalyticsService';
import { VoiceService } from '../services/VoiceService';
import jwt from 'jsonwebtoken';

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
  audioData: string; // Base64 encoded audio
  language?: string;
}

export interface ScreenShareData {
  collaborationSessionId: string;
  action: 'start' | 'stop';
  streamId?: string;
}

export class WebSocketHandlers {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket middleware
   */
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;

        logger.info('WebSocket client authenticated', { 
          socketId: socket.id, 
          userId: socket.userId,
          userRole: socket.userRole 
        });

        next();
      } catch (error) {
        logger.error('WebSocket authentication failed', { error, socketId: socket.id });
        next(new Error('Invalid authentication token'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      const rateLimitKey = `ws_rate_limit:${socket.userId}`;
      // In a real implementation, you would implement rate limiting here
      next();
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('WebSocket client connected', { 
        socketId: socket.id, 
        userId: socket.userId 
      });

      // Track connection analytics
      this.trackEvent(socket, 'websocket_connect', {});

      // Join room handler
      socket.on('join_room', async (data: JoinRoomData) => {
        await this.handleJoinRoom(socket, data);
      });

      // Leave room handler
      socket.on('leave_room', async (collaborationSessionId: string) => {
        await this.handleLeaveRoom(socket, collaborationSessionId);
      });

      // Send message handler
      socket.on('send_message', async (data: SendMessageData) => {
        await this.handleSendMessage(socket, data);
      });

      // Voice message handler
      socket.on('voice_message', async (data: VoiceData) => {
        await this.handleVoiceMessage(socket, data);
      });

      // Screen share handler
      socket.on('screen_share', async (data: ScreenShareData) => {
        await this.handleScreenShare(socket, data);
      });

      // Typing indicator handler
      socket.on('typing', (data: { collaborationSessionId: string; isTyping: boolean }) => {
        this.handleTyping(socket, data);
      });

      // Cursor position handler
      socket.on('cursor_position', (data: { collaborationSessionId: string; x: number; y: number }) => {
        this.handleCursorPosition(socket, data);
      });

      // Heartbeat handler
      socket.on('heartbeat', () => {
        socket.emit('heartbeat_ack', { timestamp: new Date() });
      });

      // Disconnect handler
      socket.on('disconnect', async (reason) => {
        await this.handleDisconnect(socket, reason);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error('WebSocket client error', { 
          error, 
          socketId: socket.id, 
          userId: socket.userId 
        });
      });
    });
  }

  /**
   * Handle joining a collaboration room
   */
  private async handleJoinRoom(socket: AuthenticatedSocket, data: JoinRoomData): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const result = await CollaborationService.joinSession({
        collaborationSessionId: data.collaborationSessionId,
        userId: socket.userId,
        role: data.role,
      });

      if (result.success) {
        const roomId = result.collaborationSession.roomId;
        socket.roomId = roomId;
        
        // Join the socket room
        await socket.join(roomId);

        // Notify other participants
        socket.to(roomId).emit('user_joined', {
          userId: socket.userId,
          role: data.role,
          timestamp: new Date(),
        });

        // Send success response with session data
        socket.emit('room_joined', {
          collaborationSession: result.collaborationSession,
          participants: result.participants,
        });

        // Track analytics
        this.trackEvent(socket, 'room_joined', {
          collaborationSessionId: data.collaborationSessionId,
          role: data.role,
        });

        logger.info('User joined WebSocket room', {
          userId: socket.userId,
          roomId,
          collaborationSessionId: data.collaborationSessionId,
        });
      } else {
        socket.emit('error', { message: 'Failed to join collaboration session' });
      }
    } catch (error) {
      logger.error('Error handling join room', { error, userId: socket.userId, data });
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle leaving a collaboration room
   */
  private async handleLeaveRoom(socket: AuthenticatedSocket, collaborationSessionId: string): Promise<void> {
    try {
      if (!socket.userId || !socket.roomId) {
        return;
      }

      await CollaborationService.leaveSession(collaborationSessionId, socket.userId);

      // Notify other participants
      socket.to(socket.roomId).emit('user_left', {
        userId: socket.userId,
        timestamp: new Date(),
      });

      // Leave the socket room
      await socket.leave(socket.roomId);
      socket.roomId = undefined;

      // Track analytics
      this.trackEvent(socket, 'room_left', { collaborationSessionId });

      logger.info('User left WebSocket room', {
        userId: socket.userId,
        collaborationSessionId,
      });
    } catch (error) {
      logger.error('Error handling leave room', { error, userId: socket.userId, collaborationSessionId });
    }
  }

  /**
   * Handle sending a message
   */
  private async handleSendMessage(socket: AuthenticatedSocket, data: SendMessageData): Promise<void> {
    try {
      if (!socket.userId || !socket.roomId) {
        socket.emit('error', { message: 'User not in a room' });
        return;
      }

      const message = await CollaborationService.sendMessage({
        collaborationSessionId: data.collaborationSessionId,
        userId: socket.userId,
        type: data.type,
        content: data.content,
        metadata: data.metadata,
      });

      // Broadcast message to all participants in the room
      this.io.to(socket.roomId).emit('message_received', message);

      // Track analytics
      this.trackEvent(socket, 'message_sent', {
        collaborationSessionId: data.collaborationSessionId,
        messageType: data.type,
        contentLength: data.content.length,
      });

      logger.info('Message sent in collaboration session', {
        userId: socket.userId,
        collaborationSessionId: data.collaborationSessionId,
        messageType: data.type,
      });
    } catch (error) {
      logger.error('Error handling send message', { error, userId: socket.userId, data });
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle voice message
   */
  private async handleVoiceMessage(socket: AuthenticatedSocket, data: VoiceData): Promise<void> {
    try {
      if (!socket.userId || !socket.roomId) {
        socket.emit('error', { message: 'User not in a room' });
        return;
      }

      // Convert base64 audio to buffer
      const audioBuffer = Buffer.from(data.audioData, 'base64');

      // Validate audio input
      VoiceService.validateAudioInput(audioBuffer);

      // Process speech-to-text
      const sttResult = await VoiceService.speechToText(audioBuffer, {
        language: data.language,
      });

      // Send the message with transcript
      const message = await CollaborationService.sendMessage({
        collaborationSessionId: data.collaborationSessionId,
        userId: socket.userId,
        type: 'voice',
        content: sttResult.transcript,
        metadata: {
          confidence: sttResult.confidence,
          language: sttResult.language,
          processingDuration: sttResult.duration,
        },
      });

      // Broadcast voice message to all participants
      this.io.to(socket.roomId).emit('voice_message_received', {
        ...message,
        audioData: data.audioData, // Include original audio for playback
      });

      // Track analytics
      this.trackEvent(socket, 'voice_message_sent', {
        collaborationSessionId: data.collaborationSessionId,
        transcriptLength: sttResult.transcript.length,
        confidence: sttResult.confidence,
        processingDuration: sttResult.duration,
      });

      logger.info('Voice message processed and sent', {
        userId: socket.userId,
        collaborationSessionId: data.collaborationSessionId,
        transcriptLength: sttResult.transcript.length,
      });
    } catch (error) {
      logger.error('Error handling voice message', { error, userId: socket.userId, data: { ...data, audioData: '[REDACTED]' } });
      socket.emit('error', { message: 'Failed to process voice message' });
    }
  }

  /**
   * Handle screen sharing
   */
  private async handleScreenShare(socket: AuthenticatedSocket, data: ScreenShareData): Promise<void> {
    try {
      if (!socket.userId || !socket.roomId) {
        socket.emit('error', { message: 'User not in a room' });
        return;
      }

      // Broadcast screen share event to other participants
      socket.to(socket.roomId).emit('screen_share_update', {
        userId: socket.userId,
        action: data.action,
        streamId: data.streamId,
        timestamp: new Date(),
      });

      // Track analytics
      this.trackEvent(socket, 'screen_share', {
        collaborationSessionId: data.collaborationSessionId,
        action: data.action,
      });

      logger.info('Screen share event', {
        userId: socket.userId,
        collaborationSessionId: data.collaborationSessionId,
        action: data.action,
      });
    } catch (error) {
      logger.error('Error handling screen share', { error, userId: socket.userId, data });
      socket.emit('error', { message: 'Failed to handle screen share' });
    }
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(socket: AuthenticatedSocket, data: { collaborationSessionId: string; isTyping: boolean }): void {
    if (!socket.userId || !socket.roomId) {
      return;
    }

    // Broadcast typing indicator to other participants
    socket.to(socket.roomId).emit('typing_update', {
      userId: socket.userId,
      isTyping: data.isTyping,
      timestamp: new Date(),
    });
  }

  /**
   * Handle cursor position updates
   */
  private handleCursorPosition(socket: AuthenticatedSocket, data: { collaborationSessionId: string; x: number; y: number }): void {
    if (!socket.userId || !socket.roomId) {
      return;
    }

    // Broadcast cursor position to other participants
    socket.to(socket.roomId).emit('cursor_update', {
      userId: socket.userId,
      x: data.x,
      y: data.y,
      timestamp: new Date(),
    });
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(socket: AuthenticatedSocket, reason: string): Promise<void> {
    try {
      if (socket.userId && socket.roomId) {
        // Find the collaboration session ID from the room
        const activeSessions = await CollaborationService.getActiveSessions();
        const session = activeSessions.find(s => s.roomId === socket.roomId);

        if (session) {
          await CollaborationService.leaveSession(session.id, socket.userId);
        }

        // Notify other participants
        socket.to(socket.roomId).emit('user_left', {
          userId: socket.userId,
          timestamp: new Date(),
          reason: 'disconnect',
        });
      }

      // Track analytics
      this.trackEvent(socket, 'websocket_disconnect', { reason });

      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
      });
    } catch (error) {
      logger.error('Error handling disconnect', { error, userId: socket.userId, reason });
    }
  }

  /**
   * Track analytics event
   */
  private async trackEvent(socket: AuthenticatedSocket, eventType: string, eventData: any): Promise<void> {
    try {
      if (socket.userId) {
        await AnalyticsService.trackEvent({
          userId: socket.userId,
          eventType: `websocket_${eventType}`,
          eventData: {
            ...eventData,
            socketId: socket.id,
            timestamp: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('Error tracking WebSocket event', { error, eventType, userId: socket.userId });
    }
  }

  /**
   * Broadcast system message to a room
   */
  public broadcastSystemMessage(roomId: string, message: string, metadata?: Record<string, any>): void {
    this.io.to(roomId).emit('system_message', {
      type: 'system',
      content: message,
      metadata: metadata || {},
      timestamp: new Date(),
    });
  }

  /**
   * Get room statistics
   */
  public getRoomStats(roomId: string): {
    participantCount: number;
    participants: string[];
  } {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    const participants: string[] = [];

    if (room) {
      for (const socketId of room) {
        const socket = this.io.sockets.sockets.get(socketId) as AuthenticatedSocket;
        if (socket?.userId) {
          participants.push(socket.userId);
        }
      }
    }

    return {
      participantCount: participants.length,
      participants,
    };
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    // Find socket by userId
    for (const [socketId, socket] of this.io.sockets.sockets) {
      const authSocket = socket as AuthenticatedSocket;
      if (authSocket.userId === userId) {
        authSocket.emit(event, data);
        break;
      }
    }
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get active rooms
   */
  public getActiveRooms(): string[] {
    return Array.from(this.io.sockets.adapter.rooms.keys()).filter(room => 
      room.startsWith('room_')
    );
  }
}

export default WebSocketHandlers;