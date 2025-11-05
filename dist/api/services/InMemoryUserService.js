"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryUserServiceInstance = void 0;
const logger_1 = require("../middleware/logger");
/**
 * In-memory user storage for development/testing
 * Replace with actual database implementation in production
 */
class InMemoryUserService {
    constructor() {
        this.users = new Map();
        this.profiles = new Map();
        this.usersByEmail = new Map();
        // Add a test user for easy development
        const testUser = {
            id: 'test-user-1',
            email: 'test@example.com',
            passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lGmGG3xY8P5K', // password: "password123"
            name: 'Test User',
            role: 'student',
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
            emailVerified: true,
            twoFactorEnabled: false,
        };
        this.users.set(testUser.id, testUser);
        this.usersByEmail.set(testUser.email, testUser);
        // Add test admin
        const testAdmin = {
            id: 'admin-user-1',
            email: 'admin@example.com',
            passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lGmGG3xY8P5K', // password: "password123"
            name: 'Admin User',
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
            emailVerified: true,
            twoFactorEnabled: false,
        };
        this.users.set(testAdmin.id, testAdmin);
        this.usersByEmail.set(testAdmin.email, testAdmin);
        logger_1.logger.info('In-memory user storage initialized with test users');
    }
    async create(userData) {
        const now = new Date();
        const user = {
            id: userData.id,
            email: userData.email,
            passwordHash: userData.passwordHash,
            name: userData.name,
            role: userData.role,
            createdAt: now,
            updatedAt: now,
            isActive: true,
            emailVerified: false,
            twoFactorEnabled: false,
        };
        this.users.set(user.id, user);
        this.usersByEmail.set(user.email, user);
        // Create default profile
        const profile = {
            userId: user.id,
            preferences: {
                theme: 'light',
                difficulty: 'adaptive',
                sessionLength: 30,
                voiceEnabled: false,
            },
            learningStyle: {
                preferredMode: 'mixed',
                pacePreference: 'moderate',
                feedbackStyle: 'encouraging',
            },
            accessibilitySettings: {
                highContrast: false,
                largeText: false,
                screenReader: false,
                keyboardNavigation: false,
            },
            notificationPreferences: {
                email: true,
                push: false,
                sessionReminders: true,
                progressUpdates: true,
            },
            timezone: 'UTC',
            language: 'en',
            updatedAt: now,
        };
        this.profiles.set(user.id, profile);
        logger_1.logger.info('User created in memory', { userId: user.id, email: user.email });
        return user;
    }
    async findById(id) {
        const user = this.users.get(id);
        return user && user.isActive ? user : null;
    }
    async findByEmail(email) {
        const user = this.usersByEmail.get(email);
        return user && user.isActive ? user : null;
    }
    async updateLastLogin(id) {
        const user = this.users.get(id);
        if (user) {
            user.lastLogin = new Date();
            user.updatedAt = new Date();
            logger_1.logger.info('User last login updated', { userId: id });
        }
    }
    async updatePassword(id, passwordHash) {
        const user = this.users.get(id);
        if (user) {
            user.passwordHash = passwordHash;
            user.updatedAt = new Date();
            logger_1.logger.info('User password updated', { userId: id });
        }
    }
    async getProfile(userId) {
        return this.profiles.get(userId) || null;
    }
    async updateProfile(userId, profileData) {
        let profile = this.profiles.get(userId);
        if (!profile) {
            // Create default profile if it doesn't exist
            profile = {
                userId,
                preferences: {},
                learningStyle: {},
                accessibilitySettings: {},
                notificationPreferences: {},
                timezone: 'UTC',
                language: 'en',
                updatedAt: new Date(),
            };
        }
        // Update profile fields
        Object.assign(profile, profileData, { updatedAt: new Date() });
        this.profiles.set(userId, profile);
        logger_1.logger.info('User profile updated', { userId });
        return profile;
    }
    async deactivate(id) {
        const user = this.users.get(id);
        if (user) {
            user.isActive = false;
            user.updatedAt = new Date();
            logger_1.logger.info('User account deactivated', { userId: id });
        }
    }
    async getAll(limit = 50, offset = 0) {
        const activeUsers = Array.from(this.users.values())
            .filter(user => user.isActive)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const total = activeUsers.length;
        const users = activeUsers.slice(offset, offset + limit);
        return { users, total };
    }
}
// Export a singleton instance
exports.InMemoryUserServiceInstance = new InMemoryUserService();
//# sourceMappingURL=InMemoryUserService.js.map