import cron from 'node-cron';
import { storage } from '../storage';
import { predictionService } from './predictionService';
import { winLossService } from './winLossService';
import { WebSocketServer } from 'ws';

interface ActiveSchedule {
  system: 'mys' | 'mz';
  interval: '30s' | '1min';
  task: cron.ScheduledTask;
}

export class SchedulerService {
  private activeSchedules: Map<string, ActiveSchedule> = new Map();
  private wss: WebSocketServer | null = null;
  private winLossCheckTask: cron.ScheduledTask | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
    this.startWinLossChecker();
  }

  private startWinLossChecker() {
    // Check win/loss results every 2 minutes
    this.winLossCheckTask = cron.schedule('*/2 * * * *', async () => {
      console.log('Checking pending prediction results...');
      await winLossService.checkAllPendingPredictions();
    }, {
      scheduled: true
    });
  }

  private broadcast(message: any) {
    if (!this.wss) return;
    
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  async startPrediction(system: 'mys' | 'mz', interval: '30s' | '1min', userId?: string) {
    const key = `${system}-${interval}`;
    
    // Stop existing schedule if any
    this.stopPrediction(system, interval);
    
    // Create cron pattern based on interval
    let cronPattern: string;
    if (interval === '30s') {
      // Run at :00 and :30 seconds of every minute
      cronPattern = '0,30 * * * * *';
    } else {
      // Run at :00 seconds of every minute
      cronPattern = '0 * * * * *';
    }
    
    const task = cron.schedule(cronPattern, async () => {
      await this.executePrediction(system, interval, userId);
    }, {
      scheduled: false
    });
    
    this.activeSchedules.set(key, { system, interval, task });
    
    // Update system status
    await storage.updateSystemStatus(system, {
      status: 'active',
      isRunning: true,
      currentInterval: interval,
      nextRun: this.getNextRunTime(interval),
    });
    
    // Start the scheduled task
    task.start();
    
    this.broadcast({
      type: 'predictionStarted',
      system,
      interval,
      nextRun: this.getNextRunTime(interval)
    });
    
    // Execute immediately
    await this.executePrediction(system, interval, userId);
  }

  stopPrediction(system: 'mys' | 'mz', interval: '30s' | '1min') {
    const key = `${system}-${interval}`;
    const schedule = this.activeSchedules.get(key);
    
    if (schedule) {
      schedule.task.stop();
      this.activeSchedules.delete(key);
    }
    
    // Update system status
    storage.updateSystemStatus(system, {
      status: 'standby',
      isRunning: false,
      currentInterval: null,
      nextRun: null,
    });
    
    this.broadcast({
      type: 'predictionStopped',
      system,
      interval
    });
  }

  stopAllPredictions() {
    this.activeSchedules.forEach((schedule, key) => {
      schedule.task.stop();
    });
    this.activeSchedules.clear();
    
    // Update all system statuses
    storage.updateSystemStatus('mys', {
      status: 'standby',
      isRunning: false,
      currentInterval: null,
      nextRun: null,
    });
    
    storage.updateSystemStatus('mz', {
      status: 'standby',
      isRunning: false,
      currentInterval: null,
      nextRun: null,
    });
    
    this.broadcast({
      type: 'allPredictionsStopped'
    });
  }

  async runOnce(system: 'mys' | 'mz', interval: '30s' | '1min', userId?: string) {
    await this.executePrediction(system, interval, userId);
  }

  private async executePrediction(system: 'mys' | 'mz', interval: '30s' | '1min', userId?: string) {
    try {
      console.log(`Executing prediction for ${system} ${interval} at ${new Date().toISOString()}`);
      
      // Update last run time
      await storage.updateSystemStatus(system, {
        lastRun: new Date(),
        nextRun: this.getNextRunTime(interval),
        errorMessage: null,
      });
      
      const result = await predictionService.runPrediction(system, interval);
      
      if ('error' in result) {
        console.error(`Prediction error for ${system} ${interval}:`, result.error);
        await storage.updateSystemStatus(system, {
          status: 'error',
          errorMessage: result.error,
        });
        
        this.broadcast({
          type: 'predictionError',
          system,
          interval,
          error: result.error
        });
        return;
      }
      
      // Parse the computed result
      const parts = result.computedResult.split(' ');
      const predictedNumber = parseInt(parts[0]);
      const predictedSize = parts[1];
      
      // Store the prediction result
      const predictionResult = await storage.createPredictionResult({
        system,
        interval,
        issueNumber: result.nextIssueNumber,
        predictedNumber,
        predictedSize,
        computation: result.computation || '',
        rawData: result,
        userId: userId || null,
        resultCheckedAt: null,
        winLossStatus: 'pending',
      });
      
      console.log(`Prediction completed for ${system} ${interval}:`, result);
      
      this.broadcast({
        type: 'predictionResult',
        system,
        interval,
        result: predictionResult,
        computation: result.computation
      });
      
    } catch (error) {
      console.error(`Error executing prediction for ${system} ${interval}:`, error);
      await storage.updateSystemStatus(system, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      this.broadcast({
        type: 'predictionError',
        system,
        interval,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getNextRunTime(interval: '30s' | '1min'): Date {
    const now = new Date();
    const nextRun = new Date(now);
    
    if (interval === '30s') {
      // Next run at :00 or :30 seconds
      const seconds = now.getSeconds();
      if (seconds < 30) {
        nextRun.setSeconds(30, 0);
      } else {
        nextRun.setMinutes(nextRun.getMinutes() + 1);
        nextRun.setSeconds(0, 0);
      }
    } else {
      // Next run at next minute :00 seconds
      nextRun.setMinutes(nextRun.getMinutes() + 1);
      nextRun.setSeconds(0, 0);
    }
    
    return nextRun;
  }

  getActiveSchedules(): string[] {
    return Array.from(this.activeSchedules.keys());
  }
}

export const schedulerService = new SchedulerService();
