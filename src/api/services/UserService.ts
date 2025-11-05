import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { logger } from '../middleware/logger';

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

export class UserService {
  private static db = DatabaseService;

  /**
   * Create a new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    try {
      const now = new Date();
      
      // Insert user
      const userQuery = `
        INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at, is_active, email_verified, two_factor_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const userValues = [
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.name,
        userData.role,
        now,
        now,
        true, // isActive
        false, // emailVerified
        false, // twoFactorEnabled
      ];

      const userResult = await this.db.query(userQuery, userValues);
      const user = userResult.rows[0];

      // Create default user profile
      const profileQuery = `
        INSERT INTO user_profiles (user_id, preferences, learning_style, accessibility_settings, notification_preferences, timezone, language, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      const defaultPreferences = {
        theme: 'light',
        difficulty: 'adaptive',
        sessionLength: 30,
        voiceEnabled: false,
      };

      const defaultLearningStyle = {
        preferredMode: 'mixed',
        pacePreference: 'moderate',
        feedbackStyle: 'encouraging',
      };

      const defaultAccessibilitySettings = {
        highContrast: false,
        largeText: false,
        screenReader: false,
        keyboardNavigation: false,
      };

      const defaultNotificationPreferences = {
        email: true,
        push: false,
        sessionReminders: true,
        progressUpdates: true,
      };

      const profileValues = [
        userData.id,
        JSON.stringify(defaultPreferences),
        JSON.stringify(defaultLearningStyle),
        JSON.stringify(defaultAccessibilitySettings),
        JSON.stringify(defaultNotificationPreferences),
        'UTC',
        'en',
        now,
      ];

      await this.db.query(profileQuery, profileValues);

      logger.info('User created successfully', { userId: userData.id, email: userData.email });

      return {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isActive: user.is_active,
        lastLogin: user.last_login,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
      };
    } catch (error) {
      logger.error('Error creating user', { error, userData: { ...userData, passwordHash: '[REDACTED]' } });
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT * FROM users WHERE id = $1 AND is_active = true
      `;
      
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isActive: user.is_active,
        lastLogin: user.last_login,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
      };
    } catch (error) {
      logger.error('Error finding user by ID', { error, userId: id });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT * FROM users WHERE email = $1 AND is_active = true
      `;
      
      const result = await this.db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isActive: user.is_active,
        lastLogin: user.last_login,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
      };
    } catch (error) {
      logger.error('Error finding user by email', { error, email });
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   */
  static async updateLastLogin(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users SET last_login = $1, updated_at = $1 WHERE id = $2
      `;
      
      await this.db.query(query, [new Date(), id]);
      
      logger.info('User last login updated', { userId: id });
    } catch (error) {
      logger.error('Error updating last login', { error, userId: id });
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      const query = `
        UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3
      `;
      
      await this.db.query(query, [passwordHash, new Date(), id]);
      
      logger.info('User password updated', { userId: id });
    } catch (error) {
      logger.error('Error updating password', { error, userId: id });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const query = `
        SELECT * FROM user_profiles WHERE user_id = $1
      `;
      
      const result = await this.db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const profile = result.rows[0];
      return {
        userId: profile.user_id,
        preferences: profile.preferences,
        learningStyle: profile.learning_style,
        accessibilitySettings: profile.accessibility_settings,
        notificationPreferences: profile.notification_preferences,
        timezone: profile.timezone,
        language: profile.language,
        updatedAt: profile.updated_at,
      };
    } catch (error) {
      logger.error('Error getting user profile', { error, userId });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (profileData.preferences !== undefined) {
        updates.push(`preferences = $${paramIndex++}`);
        values.push(JSON.stringify(profileData.preferences));
      }

      if (profileData.learningStyle !== undefined) {
        updates.push(`learning_style = $${paramIndex++}`);
        values.push(JSON.stringify(profileData.learningStyle));
      }

      if (profileData.accessibilitySettings !== undefined) {
        updates.push(`accessibility_settings = $${paramIndex++}`);
        values.push(JSON.stringify(profileData.accessibilitySettings));
      }

      if (profileData.notificationPreferences !== undefined) {
        updates.push(`notification_preferences = $${paramIndex++}`);
        values.push(JSON.stringify(profileData.notificationPreferences));
      }

      if (profileData.timezone !== undefined) {
        updates.push(`timezone = $${paramIndex++}`);
        values.push(profileData.timezone);
      }

      if (profileData.language !== undefined) {
        updates.push(`language = $${paramIndex++}`);
        values.push(profileData.language);
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(userId);

      const query = `
        UPDATE user_profiles 
        SET ${updates.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      const profile = result.rows[0];

      logger.info('User profile updated', { userId });

      return {
        userId: profile.user_id,
        preferences: profile.preferences,
        learningStyle: profile.learning_style,
        accessibilitySettings: profile.accessibility_settings,
        notificationPreferences: profile.notification_preferences,
        timezone: profile.timezone,
        language: profile.language,
        updatedAt: profile.updated_at,
      };
    } catch (error) {
      logger.error('Error updating user profile', { error, userId });
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivate(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users SET is_active = false, updated_at = $1 WHERE id = $2
      `;
      
      await this.db.query(query, [new Date(), id]);
      
      logger.info('User account deactivated', { userId: id });
    } catch (error) {
      logger.error('Error deactivating user', { error, userId: id });
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAll(limit: number = 50, offset: number = 0): Promise<{ users: User[], total: number }> {
    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM users WHERE is_active = true`;
      const countResult = await this.db.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      // Get users
      const query = `
        SELECT * FROM users 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const result = await this.db.query(query, [limit, offset]);
      
      const users = result.rows.map(user => ({
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isActive: user.is_active,
        lastLogin: user.last_login,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
      }));

      return { users, total };
    } catch (error) {
      logger.error('Error getting all users', { error });
      throw error;
    }
  }
}

export default UserService;