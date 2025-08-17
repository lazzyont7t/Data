import { storage } from "../storage";

interface WinLossCheckResult {
  number: number;
}

export class WinLossService {
  
  // Check MZ 1Min actual results
  async checkMz1Min(): Promise<WinLossCheckResult | { error: string }> {
    try {
      const url = 'https://mzplayapi.com/api/webapi/GetNoaverageEmerdList';
      const payload = {
        language: 0,
        pageNo: 1,
        pageSize: 10,
        random: this.generateRandomString(),
        signature: this.generateSignature(),
        timestamp: Math.floor(Date.now() / 1000),
        typeId: 1
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data || !data.data || !data.data.list || !data.data.list.length) {
        return { error: 'No data available from API' };
      }
      
      const issues = data.data.list;
      const firstNumber = parseInt(issues[0].number || 0);
      
      return { number: firstNumber };
    } catch (error) {
      return { error: `Error fetching data: ${error}` };
    }
  }
  
  // Check MZ 30S actual results
  async checkMz30S(): Promise<WinLossCheckResult | { error: string }> {
    try {
      const url = 'https://mzplayapi.com/api/webapi/GetNoaverageEmerdList';
      const payload = {
        language: 0,
        pageNo: 1,
        pageSize: 10,
        random: this.generateRandomString(),
        signature: this.generateSignature(),
        timestamp: Math.floor(Date.now() / 1000),
        typeId: 30
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data || !data.data || !data.data.list || !data.data.list.length) {
        return { error: 'No data available from API' };
      }
      
      const issues = data.data.list;
      const firstNumber = parseInt(issues[0].number || 0);
      
      return { number: firstNumber };
    } catch (error) {
      return { error: `Error fetching data: ${error}` };
    }
  }
  
  // Check Mys 1Min actual results
  async checkMys1Min(): Promise<WinLossCheckResult | { error: string }> {
    try {
      const url = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=' + Date.now();
      const response = await fetch(url);
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data || !data.data || !data.data.list || !data.data.list.length) {
        return { error: 'No data available from API' };
      }
      
      const issues = data.data.list;
      const firstNumber = parseInt(issues[0].number || 0);
      
      return { number: firstNumber };
    } catch (error) {
      return { error: `Error fetching data: ${error}` };
    }
  }
  
  // Check Mys 30S actual results
  async checkMys30S(): Promise<WinLossCheckResult | { error: string }> {
    try {
      const url = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=' + Date.now();
      const response = await fetch(url);
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data || !data.data || !data.data.list || !data.data.list.length) {
        return { error: 'No data available from API' };
      }
      
      const issues = data.data.list;
      const firstNumber = parseInt(issues[0].number || 0);
      
      return { number: firstNumber };
    } catch (error) {
      return { error: `Error fetching data: ${error}` };
    }
  }
  
  private generateRandomString(length: number = 32): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  private generateSignature(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase() + 
           Math.random().toString(36).substring(2, 15).toUpperCase();
  }
  
  // Check all pending predictions and update their results
  async checkAllPendingPredictions(): Promise<void> {
    try {
      // Get all predictions that haven't been checked yet
      const allResults = await storage.getPredictionResults(undefined, 100);
      const pendingResults = allResults.filter(r => r.actualNumber === null);
      
      for (const prediction of pendingResults) {
        let actualResult;
        
        // Get actual result based on system and interval
        if (prediction.system === 'mys' && prediction.interval === '30s') {
          actualResult = await this.checkMys30S();
        } else if (prediction.system === 'mys' && prediction.interval === '1min') {
          actualResult = await this.checkMys1Min();
        } else if (prediction.system === 'mz' && prediction.interval === '30s') {
          actualResult = await this.checkMz30S();
        } else if (prediction.system === 'mz' && prediction.interval === '1min') {
          actualResult = await this.checkMz1Min();
        }
        
        if (actualResult && 'number' in actualResult) {
          await storage.checkPredictionResult(prediction.id, actualResult.number);
          console.log(`Updated prediction ${prediction.id}: predicted ${prediction.predictedSize}, actual ${actualResult.number <= 4 ? 'Small' : 'Big'}`);
        }
      }
    } catch (error) {
      console.error('Error checking pending predictions:', error);
    }
  }
}

export const winLossService = new WinLossService();