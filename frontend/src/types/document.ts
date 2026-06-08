export type ParseMode = 'full' | 'chapters';

export interface Chapter {
  id: string;
  title: string;
  level: number;
  children?: Chapter[];
}

export interface DocumentUploadResult {
  documentId: string;
  filename: string;
  originalName: string;
  size: number;
  title: string;
  totalPages?: number;
  totalWordCount: number;
  chapters: Chapter[];
  message: string;
}

export interface DocumentParseRequest {
  documentId: string;
  chapterIds?: string[];
  parseMode: ParseMode;
  sessionId: string;
  system?: string;
  module?: string;
  scenario?: string;
  provider?: string;
  model?: string;
}

export interface DocumentParseResponse {
  taskId: string;
  message: string;
  status: string;
}
