import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Server, Play, Pause, SkipForward, ChartBar, Target, Calculator, Check, X, TriangleAlert, CheckCircle, XCircle, Circle, LogOut, User } from "lucide-react";

interface SystemStatus {
  id: string;
  system: string;
  status: string;
  lastRun: string | null;
  nextRun: string | null;
  isRunning: boolean;
  currentInterval: string | null;
  errorMessage: string | null;
}

interface PredictionResult {
  id: string;
  system: string;
  interval: string;
  issueNumber: string;
  predictedNumber: number;
  predictedSize: string;
  actualNumber: number | null;
  actualSize: string | null;
  isCorrect: boolean | null;
  computation: string;
  timestamp: string;
}

export default function Dashboard() {
  const [selectedSystem, setSelectedSystem] = useState<'mys' | 'mz'>('mys');
  const [selectedInterval, setSelectedInterval] = useState<'30s' | '1min'>('30s');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextExecution, setNextExecution] = useState<Date | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [latestResult, setLatestResult] = useState<PredictionResult | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  // Fetch system statuses
  const { data: systemStatuses, isLoading: statusLoading } = useQuery<SystemStatus[]>({
    queryKey: ['/api/systems/status'],
    refetchInterval: 5000,
  });

  // Fetch prediction results
  const { data: predictionResults, isLoading: resultsLoading } = useQuery<PredictionResult[]>({
    queryKey: ['/api/predictions/results'],
    refetchInterval: 10000,
  });

  // Start prediction mutation
  const startPredictionMutation = useMutation({
    mutationFn: async ({ system, interval }: { system: string; interval: string }) => {
      const response = await apiRequest('POST', '/api/predictions/start', { system, interval });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/systems/status'] });
      toast({
        title: "Prediction Started",
        description: `Started ${selectedSystem} ${selectedInterval} predictions`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to start prediction: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Pause prediction mutation
  const stopPredictionMutation = useMutation({
    mutationFn: async ({ system, interval }: { system: string; interval: string }) => {
      const response = await apiRequest('POST', '/api/predictions/stop', { system, interval });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/systems/status'] });
      toast({
        title: "Prediction Stopped",
        description: `Stopped ${selectedSystem} ${selectedInterval} predictions`,
      });
    },
  });

  // Run once mutation
  const runOnceMutation = useMutation({
    mutationFn: async ({ system, interval }: { system: string; interval: string }) => {
      const response = await apiRequest('POST', '/api/predictions/run-once', { system, interval });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictions/results'] });
      toast({
        title: "Prediction Executed",
        description: `Executed single prediction for ${selectedSystem} ${selectedInterval}`,
      });
    },
  });

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    setConnectionStatus('connecting');
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('Connected to WebSocket');
      setConnectionStatus('connected');
      setWs(websocket);
    };
    
    websocket.onclose = () => {
      console.log('Disconnected from WebSocket');
      setConnectionStatus('disconnected');
      setWs(null);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    return () => {
      websocket.close();
    };
  }, []);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'predictionResult':
        setLatestResult(message.result);
        queryClient.invalidateQueries({ queryKey: ['/api/predictions/results'] });
        queryClient.invalidateQueries({ queryKey: ['/api/systems/status'] });
        break;
      case 'predictionStarted':
        queryClient.invalidateQueries({ queryKey: ['/api/systems/status'] });
        if (message.nextRun) {
          setNextExecution(new Date(message.nextRun));
        }
        break;
      case 'predictionStopped':
        queryClient.invalidateQueries({ queryKey: ['/api/systems/status'] });
        setNextExecution(null);
        break;
      case 'predictionError':
        toast({
          title: "Prediction Error",
          description: message.error,
          variant: "destructive",
        });
        break;
    }
  };

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate next execution countdown
  const getCountdown = () => {
    if (!nextExecution) return "00:00";
    
    const now = new Date();
    const diff = Math.max(0, nextExecution.getTime() - now.getTime());
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentSystemStatus = systemStatuses?.find(s => s.system === selectedSystem);
  const isRunning = currentSystemStatus?.isRunning || false;

  const handleStartPrediction = () => {
    startPredictionMutation.mutate({ system: selectedSystem, interval: selectedInterval });
  };

  const handleStopPrediction = () => {
    stopPredictionMutation.mutate({ system: selectedSystem, interval: selectedInterval });
  };

  const handleRunOnce = () => {
    runOnceMutation.mutate({ system: selectedSystem, interval: selectedInterval });
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Circle className="w-3 h-3 text-accent fill-current animate-pulse" />;
      case 'connecting':
        return <Circle className="w-3 h-3 text-warning fill-current" />;
      default:
        return <Circle className="w-3 h-3 text-danger fill-current" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live';
      case 'connecting': return 'Connecting';
      default: return 'Disconnected';
    }
  };

  const calculateStats = () => {
    if (!predictionResults) return { accuracy: 0, total: 0, correct: 0 };
    
    const total = predictionResults.length;
    const correct = predictionResults.filter(r => r.isCorrect === true).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    return { accuracy, total, correct };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <ChartBar className="text-primary text-2xl" />
            <h1 className="text-xl font-semibold">Prediction Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-slate-700 px-3 py-1 rounded-full text-sm flex items-center">
              {getConnectionStatusIcon()}
              <span className="ml-2" data-testid="connection-status">
                {getConnectionStatusText()}
              </span>
            </div>
            <div className="text-sm text-slate-400" data-testid="current-time">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-slate-700 px-3 py-1 rounded-full">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-white" data-testid="text-username">
                  {user?.username}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-400 hover:text-white"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-80 bg-slate-800 border-r border-slate-700 p-6">
          <div className="space-y-6">
            {/* System Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Server className="mr-2 text-primary" />
                System Selection
              </h2>
              
              {/* Mys System */}
              <Card 
                className={`mb-4 border transition-colors cursor-pointer ${
                  selectedSystem === 'mys' 
                    ? 'border-primary bg-slate-700' 
                    : 'border-transparent bg-slate-700 hover:border-primary'
                }`}
                onClick={() => setSelectedSystem('mys')}
                data-testid="card-system-mys"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg">Mys System</h3>
                      <p className="text-slate-400 text-sm">AR Lottery Prediction</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        systemStatuses?.find(s => s.system === 'mys')?.isRunning 
                          ? 'bg-accent text-white' 
                          : 'bg-warning text-black'
                      }`} data-testid="status-mys">
                        {systemStatuses?.find(s => s.system === 'mys')?.isRunning ? 'Active' : 'Standby'}
                      </div>
                      <div className="text-xs text-slate-400" data-testid="text-mys-lastrun">
                        Last: {systemStatuses?.find(s => s.system === 'mys')?.lastRun 
                          ? new Date(systemStatuses.find(s => s.system === 'mys')!.lastRun!).toLocaleTimeString()
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                  
                  {selectedSystem === 'mys' && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      <div className="flex space-x-2">
                        <Button 
                          className={`flex-1 text-sm font-medium transition-colors ${
                            selectedInterval === '30s'
                              ? 'bg-primary hover:bg-blue-600 text-white'
                              : 'bg-slate-600 hover:bg-slate-500 text-white'
                          }`}
                          onClick={() => setSelectedInterval('30s')}
                          data-testid="button-interval-mys-30s"
                        >
                          <Clock className="mr-1 w-4 h-4" />
                          30S
                        </Button>
                        <Button 
                          className={`flex-1 text-sm font-medium transition-colors ${
                            selectedInterval === '1min'
                              ? 'bg-primary hover:bg-blue-600 text-white'
                              : 'bg-slate-600 hover:bg-slate-500 text-white'
                          }`}
                          onClick={() => setSelectedInterval('1min')}
                          data-testid="button-interval-mys-1min"
                        >
                          <Clock className="mr-1 w-4 h-4" />
                          1Min
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mz System */}
              <Card 
                className={`border transition-colors cursor-pointer ${
                  selectedSystem === 'mz' 
                    ? 'border-primary bg-slate-700' 
                    : 'border-transparent bg-slate-700 hover:border-primary'
                }`}
                onClick={() => setSelectedSystem('mz')}
                data-testid="card-system-mz"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg">Mz System</h3>
                      <p className="text-slate-400 text-sm">MZ Play API Prediction</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        systemStatuses?.find(s => s.system === 'mz')?.isRunning 
                          ? 'bg-accent text-white' 
                          : 'bg-warning text-black'
                      }`} data-testid="status-mz">
                        {systemStatuses?.find(s => s.system === 'mz')?.isRunning ? 'Active' : 'Standby'}
                      </div>
                      <div className="text-xs text-slate-400" data-testid="text-mz-lastrun">
                        Last: {systemStatuses?.find(s => s.system === 'mz')?.lastRun 
                          ? new Date(systemStatuses.find(s => s.system === 'mz')!.lastRun!).toLocaleTimeString()
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                  
                  {selectedSystem === 'mz' && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      <div className="flex space-x-2">
                        <Button 
                          className={`flex-1 text-sm font-medium transition-colors ${
                            selectedInterval === '30s'
                              ? 'bg-primary hover:bg-blue-600 text-white'
                              : 'bg-slate-600 hover:bg-slate-500 text-white'
                          }`}
                          onClick={() => setSelectedInterval('30s')}
                          data-testid="button-interval-mz-30s"
                        >
                          <Clock className="mr-1 w-4 h-4" />
                          30S
                        </Button>
                        <Button 
                          className={`flex-1 text-sm font-medium transition-colors ${
                            selectedInterval === '1min'
                              ? 'bg-primary hover:bg-blue-600 text-white'
                              : 'bg-slate-600 hover:bg-slate-500 text-white'
                          }`}
                          onClick={() => setSelectedInterval('1min')}
                          data-testid="button-interval-mz-1min"
                        >
                          <Clock className="mr-1 w-4 h-4" />
                          1Min
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Control Panel */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Server className="mr-2 text-primary" />
                Controls
              </h3>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-accent hover:bg-green-600 text-white px-4 py-3 font-medium transition-colors flex items-center justify-center"
                  onClick={handleStartPrediction}
                  disabled={isRunning || startPredictionMutation.isPending}
                  data-testid="button-start"
                >
                  <Play className="mr-2 w-4 h-4" />
                  {startPredictionMutation.isPending ? 'Starting...' : 'Start Prediction'}
                </Button>
                <Button 
                  className="w-full bg-danger hover:bg-red-600 text-white px-4 py-3 font-medium transition-colors flex items-center justify-center"
                  onClick={handleStopPrediction}
                  disabled={!isRunning || stopPredictionMutation.isPending}
                  data-testid="button-stop"
                >
                  <Pause className="mr-2 w-4 h-4" />
                  {stopPredictionMutation.isPending ? 'Stopping...' : 'Pause Prediction'}
                </Button>
                <Button 
                  className="w-full bg-slate-600 hover:bg-slate-500 text-white px-4 py-3 font-medium transition-colors flex items-center justify-center"
                  onClick={handleRunOnce}
                  disabled={runOnceMutation.isPending}
                  data-testid="button-run-once"
                >
                  <SkipForward className="mr-2 w-4 h-4" />
                  {runOnceMutation.isPending ? 'Running...' : 'Run Once'}
                </Button>
              </div>
            </div>

            {/* Next Execution Timer */}
            <Card className="bg-slate-700">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <Clock className="mr-2 text-warning" />
                  Next Execution
                </h4>
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-primary" data-testid="text-countdown">
                    {getCountdown()}
                  </div>
                  <div className="text-xs text-slate-400 mt-1" data-testid="text-next-execution">
                    {nextExecution ? `at ${nextExecution.toLocaleTimeString()}` : 'Not scheduled'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            
            {/* Current Configuration */}
            <Card className="bg-slate-800">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Server className="mr-2 text-primary" />
                  Current Configuration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-slate-400 mb-1">Selected System</div>
                      <div className="font-semibold text-lg" data-testid="text-selected-system">
                        {selectedSystem === 'mys' ? 'Mys System' : 'Mz System'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-slate-400 mb-1">Time Interval</div>
                      <div className="font-semibold text-lg" data-testid="text-selected-interval">
                        {selectedInterval === '30s' ? '30 Seconds' : '1 Minute'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-slate-400 mb-1">Status</div>
                      <div className="font-semibold text-lg flex items-center">
                        {isRunning ? (
                          <>
                            <Circle className="text-accent mr-2 w-4 h-4 fill-current animate-pulse" />
                            <span data-testid="text-status">Running</span>
                          </>
                        ) : (
                          <>
                            <Circle className="text-slate-400 mr-2 w-4 h-4 fill-current" />
                            <span data-testid="text-status">Stopped</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Latest Prediction Results */}
            <Card className="bg-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <ChartBar className="mr-2 text-primary" />
                    Latest Prediction Results
                  </h2>
                  <div className="text-sm text-slate-400" data-testid="text-last-update">
                    Updated: {latestResult?.timestamp ? new Date(latestResult.timestamp).toLocaleTimeString() : 'Never'}
                  </div>
                </div>

                {/* Current Prediction Display */}
                {latestResult && (
                  <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 mb-6">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="text-sm text-slate-300 mb-2">Next Issue Number</div>
                        <div className="text-3xl font-bold mb-4" data-testid="text-next-issue">
                          {latestResult.issueNumber}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <div className="text-sm text-slate-300 mb-1">Predicted Number</div>
                            <div className="text-5xl font-bold text-primary" data-testid="text-predicted-number">
                              {latestResult.predictedNumber}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-300 mb-1">Size Prediction</div>
                            <div 
                              className="text-2xl font-semibold px-4 py-2 rounded-full inline-block bg-accent text-white"
                              data-testid="text-predicted-size"
                            >
                              {latestResult.predictedSize}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-600">
                          <div className="text-xs text-slate-400">
                            Computation: <span className="font-mono" data-testid="text-computation">
                              {latestResult.computation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Historical Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Issue Number</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Predicted</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Actual</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {predictionResults?.slice(0, 10).map((result, index) => (
                        <tr key={result.id} className="hover:bg-slate-700/50" data-testid={`row-result-${index}`}>
                          <td className="px-4 py-3 font-mono text-sm">{result.issueNumber}</td>
                          <td className="px-4 py-3 font-bold text-lg">{result.predictedNumber}</td>
                          <td className="px-4 py-3 font-bold text-lg">
                            {result.actualNumber ?? '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              result.predictedSize === 'Big' 
                                ? 'bg-accent text-white' 
                                : 'bg-slate-500 text-white'
                            }`}>
                              {result.predictedSize}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {result.isCorrect === true ? (
                              <>
                                <CheckCircle className="inline w-4 h-4 text-accent" />
                                <span className="text-accent ml-1">Correct</span>
                              </>
                            ) : result.isCorrect === false ? (
                              <>
                                <XCircle className="inline w-4 h-4 text-danger" />
                                <span className="text-danger ml-1">Wrong</span>
                              </>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : '-'}
                          </td>
                        </tr>
                      ))}
                      {(!predictionResults || predictionResults.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            No prediction results available. Start a prediction to see results.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold" data-testid="text-accuracy">{stats.accuracy}%</div>
                      <div className="text-sm text-slate-400">Accuracy Rate</div>
                    </div>
                    <Target className="text-accent text-2xl" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold" data-testid="text-total">{stats.total}</div>
                      <div className="text-sm text-slate-400">Total Predictions</div>
                    </div>
                    <Calculator className="text-primary text-2xl" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold" data-testid="text-correct">{stats.correct}</div>
                      <div className="text-sm text-slate-400">Correct</div>
                    </div>
                    <Check className="text-accent text-2xl" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold" data-testid="text-uptime">99.8%</div>
                      <div className="text-sm text-slate-400">System Uptime</div>
                    </div>
                    <Server className="text-warning text-2xl" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Status Log */}
            <Card className="bg-slate-800">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <TriangleAlert className="mr-2 text-warning" />
                  System Log
                </h2>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {currentSystemStatus?.errorMessage && (
                      <div className="text-danger">
                        [{currentTime.toLocaleTimeString()}] ERROR: {currentSystemStatus.errorMessage}
                      </div>
                    )}
                    {predictionResults?.slice(0, 5).map((result, index) => (
                      <div key={result.id} className="text-accent">
                        [{result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : 'Unknown'}] INFO: Prediction completed for {result.system.toUpperCase()} {result.interval.toUpperCase()}
                      </div>
                    ))}
                    {(!predictionResults || predictionResults.length === 0) && (
                      <div className="text-slate-400">
                        [{currentTime.toLocaleTimeString()}] INFO: System initialized, no predictions yet
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}
