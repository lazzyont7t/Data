import { type InsertPredictionResult } from "@shared/schema";

interface PredictionData {
  nextIssueNumber: string;
  allNumbers: number;
  computedResult: string;
  computation?: string;
}

export class PredictionService {
  
  // Convert Python Mys 30S prediction logic
  async predictMys30S(): Promise<PredictionData | { error: string }> {
    try {
      const url = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=' + Date.now();
      const response = await fetch(url);
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data || !data.data || !data.data.list) {
        return { error: 'No data available from API' };
      }
      
      const issues = data.data.list;
      
      // Get highest issueNumber and increment by 1
      const highestIssue = issues.reduce((max: any, item: any) => 
        parseInt(item.issueNumber) > parseInt(max.issueNumber) ? item : max
      );
      const nextIssueNumber = (parseInt(highestIssue.issueNumber) + 1).toString();
      
      // Combine all numbers into a single string
      const allNumbersStr = issues.map((item: any) => item.number || 0).join('');
      
      // Logic (count from back to front, exact)
      const firstNum = parseInt(allNumbersStr[0]);
      const length = allNumbersStr.length;
      const posIndex = length - firstNum; // count from back to front
      
      const digitAtPlace = parseInt(allNumbersStr[posIndex]);
      
      // Pick the next digit toward the front (to the left in string)
      const nextDigit = posIndex - 1 >= 0 ? parseInt(allNumbersStr[posIndex - 1]) : 0;
      
      const lastDigit = parseInt(allNumbersStr[allNumbersStr.length - 1]);
      let total = (digitAtPlace + nextDigit) * lastDigit;
      
      const computation = `(${digitAtPlace} + ${nextDigit}) × ${lastDigit} = ${total}`;
      
      // Reduce to single digit
      while (total > 9) {
        total = total.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
      }
      
      const resultDigit = total;
      const size = resultDigit <= 4 ? "Small" : "Big";
      
      return {
        nextIssueNumber,
        allNumbers: parseInt(allNumbersStr),
        computedResult: `${resultDigit} ${size}`,
        computation: computation + (total !== (digitAtPlace + nextDigit) * lastDigit ? ` → ${total}` : ''),
      };
    } catch (error) {
      return { error: `Error fetching data: ${error}` };
    }
  }
  
  // Convert Python Mys 1Min prediction logic
  async predictMys1Min(): Promise<PredictionData | { error: string }> {
    try {
      const url = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=' + Date.now();
      const response = await fetch(url);
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data || !data.data || !data.data.list) {
        return { error: 'No data available from API' };
      }
      
      const issues = data.data.list;
      
      // Get highest issueNumber and increment by 1
      const highestIssue = issues.reduce((max: any, item: any) => 
        parseInt(item.issueNumber) > parseInt(max.issueNumber) ? item : max
      );
      const nextIssueNumber = (parseInt(highestIssue.issueNumber) + 1).toString();
      
      // Combine all numbers into a single string
      const allNumbersStr = issues.map((item: any) => item.number || 0).join('');
      
      // Logic (count from back to front, exact)
      const firstNum = parseInt(allNumbersStr[0]);
      const length = allNumbersStr.length;
      const posIndex = length - firstNum; // count from back to front
      
      const digitAtPlace = parseInt(allNumbersStr[posIndex]);
      
      // Pick the next digit toward the front (to the left in string)
      const nextDigit = posIndex - 1 >= 0 ? parseInt(allNumbersStr[posIndex - 1]) : 0;
      
      const lastDigit = parseInt(allNumbersStr[allNumbersStr.length - 1]);
      let total = (digitAtPlace + nextDigit) * lastDigit;
      
      const computation = `(${digitAtPlace} + ${nextDigit}) × ${lastDigit} = ${total}`;
      
      // Reduce to single digit
      while (total > 9) {
        total = total.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
      }
      
      const resultDigit = total;
      const size = resultDigit <= 4 ? "Small" : "Big";
      
      return {
        nextIssueNumber,
        allNumbers: parseInt(allNumbersStr),
        computedResult: `${resultDigit} ${size}`,
        computation: computation + (total !== (digitAtPlace + nextDigit) * lastDigit ? ` → ${total}` : ''),
      };
    } catch (error) {
      return { error: `Error fetching data: ${error}` };
    }
  }
  
  // Convert Python Mz 30S prediction logic
  async predictMz30S(): Promise<PredictionData | { error: string }> {
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
      
      if (!data || !data.data || !data.data.list) {
        return { error: 'No data available from API' };
      }
      
      const issues = data.data.list;
      
      // Combine all numbers into a single string
      const allNumbersStr = issues.map((item: any) => item.number || 0).join('');
      
      // Logic (count from back to front)
      const firstNum = parseInt(allNumbersStr[0]);
      const length = allNumbersStr.length;
      const posIndex = length - firstNum; // count from back
      
      const digitAtPlace = parseInt(allNumbersStr[posIndex]);
      
      // Pick the next digit toward the front (left)
      const nextDigit = posIndex - 1 >= 0 ? parseInt(allNumbersStr[posIndex - 1]) : 0;
      
      const lastDigit = parseInt(allNumbersStr[allNumbersStr.length - 1]);
      let total = (digitAtPlace + nextDigit) * lastDigit;
      
      const computation = `(${digitAtPlace} + ${nextDigit}) × ${lastDigit} = ${total}`;
      
      // Reduce to single digit
      while (total > 9) {
        total = total.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
      }
      
      const resultDigit = total;
      const size = resultDigit <= 4 ? "Small" : "Big";
      
      // Get highest issueNumber and increment by 1
      const highestIssue = issues.reduce((max: any, item: any) => 
        parseInt(item.issueNumber) > parseInt(max.issueNumber) ? item : max
      );
      const nextIssueNumber = (parseInt(highestIssue.issueNumber) + 1).toString();
      
      return {
        nextIssueNumber,
        allNumbers: parseInt(allNumbersStr),
        computedResult: `${resultDigit} ${size}`,
        computation: computation + (total !== (digitAtPlace + nextDigit) * lastDigit ? ` → ${total}` : ''),
      };
    } catch (error) {
      return { error: `Error fetching data: ${error}` };
    }
  }
  
  // Convert Python Mz 1Min prediction logic
  async predictMz1Min(): Promise<PredictionData | { error: string }> {
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
      
      if (!data || !data.data || !data.data.list) {
        return { error: 'No data available from API' };
      }
      
      const issues = data.data.list;
      
      // Combine all numbers into a single string
      const allNumbersStr = issues.map((item: any) => item.number || 0).join('');
      
      // Logic (count from back to front)
      const firstNum = parseInt(allNumbersStr[0]);
      const length = allNumbersStr.length;
      const posIndex = length - firstNum; // count from back
      
      const digitAtPlace = parseInt(allNumbersStr[posIndex]);
      
      // Pick the next digit toward the front (left)
      const nextDigit = posIndex - 1 >= 0 ? parseInt(allNumbersStr[posIndex - 1]) : 0;
      
      const lastDigit = parseInt(allNumbersStr[allNumbersStr.length - 1]);
      let total = (digitAtPlace + nextDigit) * lastDigit;
      
      const computation = `(${digitAtPlace} + ${nextDigit}) × ${lastDigit} = ${total}`;
      
      // Reduce to single digit
      while (total > 9) {
        total = total.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
      }
      
      const resultDigit = total;
      const size = resultDigit <= 4 ? "Small" : "Big";
      
      // Get highest issueNumber and increment by 1
      const highestIssue = issues.reduce((max: any, item: any) => 
        parseInt(item.issueNumber) > parseInt(max.issueNumber) ? item : max
      );
      const nextIssueNumber = (parseInt(highestIssue.issueNumber) + 1).toString();
      
      return {
        nextIssueNumber,
        allNumbers: parseInt(allNumbersStr),
        computedResult: `${resultDigit} ${size}`,
        computation: computation + (total !== (digitAtPlace + nextDigit) * lastDigit ? ` → ${total}` : ''),
      };
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
    // Simple signature generation - in production this should be more secure
    return Math.random().toString(36).substring(2, 15).toUpperCase() + 
           Math.random().toString(36).substring(2, 15).toUpperCase();
  }
  
  async runPrediction(system: 'mys' | 'mz', interval: '30s' | '1min'): Promise<PredictionData | { error: string }> {
    if (system === 'mys' && interval === '30s') {
      return this.predictMys30S();
    } else if (system === 'mys' && interval === '1min') {
      return this.predictMys1Min();
    } else if (system === 'mz' && interval === '30s') {
      return this.predictMz30S();
    } else if (system === 'mz' && interval === '1min') {
      return this.predictMz1Min();
    } else {
      return { error: 'Invalid system or interval' };
    }
  }
}

export const predictionService = new PredictionService();
