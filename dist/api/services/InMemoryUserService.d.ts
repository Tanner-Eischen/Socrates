import { User, CreateUserData, UserProfile } from './UserService';
/**
 * In-memory user storage for development/testing
 * Replace with actual database implementation in production
 */
declare class InMemoryUserService {
    private users;
    private profiles;
    private usersByEmail;
    constructor();
    create(userData: CreateUserData): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    updateLastLogin(id: string): Promise<void>;
    updatePassword(id: string, passwordHash: string): Promise<void>;
    getProfile(userId: string): Promise<UserProfile | null>;
    updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile>;
    deactivate(id: string): Promise<void>;
    getAll(limit?: number, offset?: number): Promise<{
        users: User[];
        total: number;
    }>;
}
export declare const InMemoryUserServiceInstance: InMemoryUserService;
export {};
//# sourceMappingURL=InMemoryUserService.d.ts.map