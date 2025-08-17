import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { schedulerService } from "./services/schedulerService";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { insertUserSchema, loginUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Session configuration
  const pgStore = connectPg(session);
  app.use(session({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      tableName: 'sessions'
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  schedulerService.setWebSocketServer(wss);

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to prediction dashboard'
    }));
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // API Routes
  
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      req.session.userId = user.id;
      
      // Don't send password in response
      const { password, ...userResponse } = user;
      res.json({ user: userResponse });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginUserSchema.parse(req.body);
      
      const user = await storage.authenticateUser(credentials.username, credentials.password);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      req.session.userId = user.id;
      
      // Don't send password in response
      const { password, ...userResponse } = user;
      res.json({ user: userResponse });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req: any, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't send password in response
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Get all system statuses
  app.get("/api/systems/status", async (req, res) => {
    try {
      const statuses = await storage.getAllSystemStatus();
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ error: "Failed to get system statuses" });
    }
  });

  // Start prediction
  app.post("/api/predictions/start", requireAuth, async (req, res) => {
    try {
      const { system, interval } = req.body;
      
      if (!system || !interval) {
        return res.status(400).json({ error: "System and interval are required" });
      }
      
      if (!['mys', 'mz'].includes(system)) {
        return res.status(400).json({ error: "Invalid system. Must be 'mys' or 'mz'" });
      }
      
      if (!['30s', '1min'].includes(interval)) {
        return res.status(400).json({ error: "Invalid interval. Must be '30s' or '1min'" });
      }
      
      await schedulerService.startPrediction(system as 'mys' | 'mz', interval as '30s' | '1min', req.session.userId);
      
      res.json({ 
        message: `Started prediction for ${system} ${interval}`,
        system,
        interval
      });
    } catch (error) {
      console.error('Error starting prediction:', error);
      res.status(500).json({ error: "Failed to start prediction" });
    }
  });

  // Stop prediction
  app.post("/api/predictions/stop", requireAuth, async (req, res) => {
    try {
      const { system, interval } = req.body;
      
      if (!system || !interval) {
        return res.status(400).json({ error: "System and interval are required" });
      }
      
      schedulerService.stopPrediction(system as 'mys' | 'mz', interval as '30s' | '1min');
      
      res.json({ 
        message: `Stopped prediction for ${system} ${interval}`,
        system,
        interval
      });
    } catch (error) {
      console.error('Error stopping prediction:', error);
      res.status(500).json({ error: "Failed to stop prediction" });
    }
  });

  // Stop all predictions
  app.post("/api/predictions/stop-all", requireAuth, async (req, res) => {
    try {
      schedulerService.stopAllPredictions();
      res.json({ message: "Stopped all predictions" });
    } catch (error) {
      console.error('Error stopping all predictions:', error);
      res.status(500).json({ error: "Failed to stop all predictions" });
    }
  });

  // Run once
  app.post("/api/predictions/run-once", requireAuth, async (req, res) => {
    try {
      const { system, interval } = req.body;
      
      if (!system || !interval) {
        return res.status(400).json({ error: "System and interval are required" });
      }
      
      if (!['mys', 'mz'].includes(system)) {
        return res.status(400).json({ error: "Invalid system. Must be 'mys' or 'mz'" });
      }
      
      if (!['30s', '1min'].includes(interval)) {
        return res.status(400).json({ error: "Invalid interval. Must be '30s' or '1min'" });
      }
      
      await schedulerService.runOnce(system as 'mys' | 'mz', interval as '30s' | '1min', req.session.userId);
      
      res.json({ 
        message: `Executed single prediction for ${system} ${interval}`,
        system,
        interval
      });
    } catch (error) {
      console.error('Error running single prediction:', error);
      res.status(500).json({ error: "Failed to run prediction" });
    }
  });

  // Get prediction results
  app.get("/api/predictions/results", requireAuth, async (req: any, res) => {
    try {
      const { system, limit } = req.query;
      const results = await storage.getPredictionResults(
        system as string, 
        limit ? parseInt(limit as string) : undefined,
        req.session.userId
      );
      res.json(results);
    } catch (error) {
      console.error('Error getting prediction results:', error);
      res.status(500).json({ error: "Failed to get prediction results" });
    }
  });

  // Get active schedules
  app.get("/api/schedules/active", requireAuth, (req, res) => {
    try {
      const schedules = schedulerService.getActiveSchedules();
      res.json({ schedules });
    } catch (error) {
      console.error('Error getting active schedules:', error);
      res.status(500).json({ error: "Failed to get active schedules" });
    }
  });

  return httpServer;
}
