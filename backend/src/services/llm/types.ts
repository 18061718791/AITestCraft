import { TestPoint, TestCase } from '../../types';

export interface Base64Image {
  base64: string;
  mimeType: string;
  fileName?: string;
}

export interface LLMConfig {
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
}

export interface GeneratePointsParams {
  requirement: string;
  system?: string | undefined;
  module?: string | undefined;
  scenario?: string | undefined;
  images?: Base64Image[];
}

export interface GenerateCasesParams {
  testPoints: string[];
  system?: string | undefined;
  module?: string | undefined;
  scenario?: string | undefined;
  onProgress?: ((completed: number, total: number, batchCases: TestCase[]) => void) | undefined;
}

export interface RequestOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ProviderCapability {
  supportsStreaming: boolean;
  supportsBatching: boolean;
  maxBatchSize: number;
  recommendedTemperature: number;
  recommendedBatchSize?: number;
  supportsVision: boolean;
  visionModels: string[];
}
