export interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'student' | 'tutor' | 'admin';
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    lastLogin?: Date;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
}
export interface UserProfile {
    userId: string;
    preferences: Record<string, any>;
    learningStyle: Record<string, any>;
    accessibilitySettings: Record<string, any>;
    notificationPreferences: Record<string, any>;
    timezone: string;
    language: string;
    updatedAt: Date;
}
export interface CreateUserData {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'student' | 'tutor' | 'admin';
}
export declare class UserService {
    private static db;
    /**
     * Create a new user
     */
    static create(userData: CreateUserData): Promise<User>;
    /**
     * Find user by ID
     */
    static findById(id: string): Promise<User | null>;
    /**
     * Find user by email
     */
    static findByEmail(email: string): Promise<User | null>;
    /**
     * Update user's last login timestamp
     */
    static updateLastLogin(id: string): Promise<void>;
    /**
     * Update user password
     */
    static updatePassword(id: string, passwordHash: string): Promise<void>;
    /**
     * Get user profile
     */
    static getProfile(userId: string): Promise<UserProfile | null>;
    /**
     * Update user profile
     */
    static updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile>;
    /**
     * Deactivate user account
     */
    static deactivate(id: string): Promise<void>;
    /**
     * Get all users (admin only)
     */
    static getAll(limit?: number, offset?: number): Promise<{
        users: User[];
        total: number;
    }>;
}
export default UserService;
//# sourceMappingURL=UserService.d.ts.map