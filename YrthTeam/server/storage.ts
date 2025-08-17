import { type User, type InsertUser, type PredictionResult, type InsertPredictionResult, type SystemStatus, type InsertSystemStatus, type UserStats, users, predictionResults, systemStatus, userStats } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  authenticateUser(username: string, password: string): Promise<User | null>;
  
  // Prediction results
  createPredictionResult(result: InsertPredictionResult): Promise<PredictionResult>;
  getPredictionResults(system?: string, limit?: number, userId?: string): Promise<PredictionResult[]>;
  updatePredictionResult(id: string, updates: Partial<PredictionResult>): Promise<PredictionResult | undefined>;
  
  // System status
  getSystemStatus(system: string): Promise<SystemStatus | undefined>;
  updateSystemStatus(system: string, updates: Partial<SystemStatus>): Promise<SystemStatus>;
  getAllSystemStatus(): Promise<SystemStatus[]>;
  
  // User statistics
  getUserStats(userId: string, system?: string, interval?: string): Promise<UserStats[]>;
  updateUserStats(userId: string, system: string, interval: string, isCorrect: boolean): Promise<void>;
  
  // Win/Loss tracking
  checkPredictionResult(predictionId: string, actualNumber: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Prediction results
  async createPredictionResult(result: InsertPredictionResult): Promise<PredictionResult> {
    const [predictionResult] = await db
      .insert(predictionResults)
      .values(result)
      .returning();
    return predictionResult;
  }

  async getPredictionResults(system?: string, limit: number = 50, userId?: string): Promise<PredictionResult[]> {
    let query = db.select().from(predictionResults);
    
    if (system && userId) {
      query = query.where(and(eq(predictionResults.system, system), eq(predictionResults.userId, userId)));
    } else if (system) {
      query = query.where(eq(predictionResults.system, system));
    } else if (userId) {
      query = query.where(eq(predictionResults.userId, userId));
    }
    
    return query
      .orderBy(desc(predictionResults.timestamp))
      .limit(limit);
  }

  async updatePredictionResult(id: string, updates: Partial<PredictionResult>): Promise<PredictionResult | undefined> {
    const [updated] = await db
      .update(predictionResults)
      .set(updates)
      .where(eq(predictionResults.id, id))
      .returning();
    return updated;
  }

  // System status
  async getSystemStatus(system: string): Promise<SystemStatus | undefined> {
    const [status] = await db.select().from(systemStatus).where(eq(systemStatus.system, system));
    return status || undefined;
  }

  async updateSystemStatus(system: string, updates: Partial<SystemStatus>): Promise<SystemStatus> {
    const existing = await this.getSystemStatus(system);
    
    if (existing) {
      const [updated] = await db
        .update(systemStatus)
        .set(updates)
        .where(eq(systemStatus.system, system))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemStatus)
        .values({
          system,
          status: 'standby',
          isRunning: false,
          ...updates,
        } as any)
        .returning();
      return created;
    }
  }

  async getAllSystemStatus(): Promise<SystemStatus[]> {
    return db.select().from(systemStatus);
  }

  // User statistics
  async getUserStats(userId: string, system?: string, interval?: string): Promise<UserStats[]> {
    let query = db.select().from(userStats).where(eq(userStats.userId, userId));
    
    if (system && interval) {
      query = query.where(and(
        eq(userStats.userId, userId),
        eq(userStats.system, system),
        eq(userStats.interval, interval)
      ));
    } else if (system) {
      query = query.where(and(
        eq(userStats.userId, userId),
        eq(userStats.system, system)
      ));
    }
    
    return query;
  }

  async updateUserStats(userId: string, system: string, interval: string, isCorrect: boolean): Promise<void> {
    const existing = await db.select()
      .from(userStats)
      .where(and(
        eq(userStats.userId, userId),
        eq(userStats.system, system),
        eq(userStats.interval, interval)
      ));

    if (existing.length > 0) {
      const stats = existing[0];
      const newTotal = stats.totalPredictions + 1;
      const newCorrect = stats.correctPredictions + (isCorrect ? 1 : 0);
      const newWinRate = Math.round((newCorrect / newTotal) * 100);

      await db
        .update(userStats)
        .set({
          totalPredictions: newTotal,
          correctPredictions: newCorrect,
          winRate: newWinRate,
          lastUpdated: new Date(),
        })
        .where(eq(userStats.id, stats.id));
    } else {
      await db
        .insert(userStats)
        .values({
          userId,
          system,
          interval,
          totalPredictions: 1,
          correctPredictions: isCorrect ? 1 : 0,
          winRate: isCorrect ? 100 : 0,
        });
    }
  }

  // Win/Loss tracking
  async checkPredictionResult(predictionId: string, actualNumber: number): Promise<boolean> {
    const [prediction] = await db.select()
      .from(predictionResults)
      .where(eq(predictionResults.id, predictionId));

    if (!prediction) return false;

    const actualSize = actualNumber <= 4 ? 'Small' : 'Big';
    const isCorrect = prediction.predictedSize === actualSize;

    await this.updatePredictionResult(predictionId, {
      actualNumber,
      actualSize,
      isCorrect,
      resultCheckedAt: new Date(),
      winLossStatus: isCorrect ? 'win' : 'loss',
    });

    // Update user statistics if user is associated
    if (prediction.userId) {
      await this.updateUserStats(prediction.userId, prediction.system, prediction.interval, isCorrect);
    }

    return isCorrect;
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private predictionResults: Map<string, PredictionResult>;
  private systemStatuses: Map<string, SystemStatus>;

  constructor() {
    this.users = new Map();
    this.predictionResults = new Map();
    this.systemStatuses = new Map();
    
    // Initialize default system statuses
    this.initializeSystemStatuses();
  }

  private initializeSystemStatuses() {
    const mysStatus: SystemStatus = {
      id: randomUUID(),
      system: 'mys',
      status: 'standby',
      lastRun: null,
      nextRun: null,
      isRunning: false,
      currentInterval: null,
      errorMessage: null,
    };
    
    const mzStatus: SystemStatus = {
      id: randomUUID(),
      system: 'mz',
      status: 'standby',
      lastRun: null,
      nextRun: null,
      isRunning: false,
      currentInterval: null,
      errorMessage: null,
    };
    
    this.systemStatuses.set('mys', mysStatus);
    this.systemStatuses.set('mz', mzStatus);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = { 
      ...insertUser, 
      id,
      password: hashedPassword,
      email: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createPredictionResult(result: InsertPredictionResult): Promise<PredictionResult> {
    const id = randomUUID();
    const predictionResult: PredictionResult = {
      ...result,
      id,
      timestamp: new Date(),
      actualNumber: null,
      actualSize: null,
      isCorrect: null,
    };
    this.predictionResults.set(id, predictionResult);
    return predictionResult;
  }

  async getPredictionResults(system?: string, limit: number = 50, userId?: string): Promise<PredictionResult[]> {
    let results = Array.from(this.predictionResults.values());
    
    if (system) {
      results = results.filter(r => r.system === system);
    }
    if (userId) {
      results = results.filter(r => r.userId === userId);
    }
    
    return results
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }

  async updatePredictionResult(id: string, updates: Partial<PredictionResult>): Promise<PredictionResult | undefined> {
    const existing = this.predictionResults.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.predictionResults.set(id, updated);
    return updated;
  }

  async getSystemStatus(system: string): Promise<SystemStatus | undefined> {
    return this.systemStatuses.get(system);
  }

  async updateSystemStatus(system: string, updates: Partial<SystemStatus>): Promise<SystemStatus> {
    const existing = this.systemStatuses.get(system) || {
      id: randomUUID(),
      system,
      status: 'standby',
      lastRun: null,
      nextRun: null,
      isRunning: false,
      currentInterval: null,
      errorMessage: null,
    };
    
    const updated = { ...existing, ...updates };
    this.systemStatuses.set(system, updated);
    return updated;
  }

  async getAllSystemStatus(): Promise<SystemStatus[]> {
    return Array.from(this.systemStatuses.values());
  }

  // User statistics (memory implementation)
  async getUserStats(userId: string, system?: string, interval?: string): Promise<UserStats[]> {
    // Simple implementation for memory storage
    return [];
  }

  async updateUserStats(userId: string, system: string, interval: string, isCorrect: boolean): Promise<void> {
    // Simple implementation for memory storage
  }

  // Win/Loss tracking
  async checkPredictionResult(predictionId: string, actualNumber: number): Promise<boolean> {
    const prediction = this.predictionResults.get(predictionId);
    if (!prediction) return false;

    const actualSize = actualNumber <= 4 ? 'Small' : 'Big';
    const isCorrect = prediction.predictedSize === actualSize;

    const updated = {
      ...prediction,
      actualNumber,
      actualSize,
      isCorrect,
      resultCheckedAt: new Date(),
      winLossStatus: isCorrect ? 'win' : 'loss',
    };
    this.predictionResults.set(predictionId, updated);

    return isCorrect;
  }
}

export const storage = new DatabaseStorage();
