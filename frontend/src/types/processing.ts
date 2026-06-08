export type LogLevel = 'info' | 'success' | 'warning' | 'error';
export type ProcessStage = 'idle' | 'connecting' | 'analyzing' | 'generating' | 'completed' | 'failed';

export interface ProcessingLog {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  details?: string;
}

export interface ProcessingStatus {
  stage: ProcessStage;
  progress: number;
  currentStep: string;
}
