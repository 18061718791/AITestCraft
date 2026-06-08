import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TestCase, TestPoint, TestPointCategory } from '../types';
import { DocumentUploadResult, ParseMode } from '../types/document';
import { ProcessingLog, ProcessingStatus } from '../types/processing';

export interface UploadedImage {
  id: string;
  base64: string;
  mimeType: string;
  fileName: string;
  previewUrl: string;
}

export interface AppState {
  sessionId: string;
  currentStep: 1 | 2 | 3;
  requirement: string;
  testPoints: TestPoint[];
  testPointCategories: TestPointCategory[];
  selectedTestPoints: string[];
  testCases: TestCase[];
  selectedTestCases: TestCase[];
  isLoading: boolean;
  taskId?: string;
  error?: string | null;
  selectedSystem?: {
    id: number;
    name: string;
  } | null;
  selectedModule?: {
    id: number;
    name: string;
  } | null;
  selectedScenario?: {
    id: number;
    name: string;
  } | null;
  selectedProvider?: string;
  selectedModel?: string;
  uploadedImages: UploadedImage[];
  isVisionFallback: boolean;
  showDesignMethod: boolean;
  // 文档解析相关状态
  currentDocument: DocumentUploadResult | null;
  selectedChapters: string[];
  parseMode: ParseMode;
  isUploading: boolean;
  // 处理日志相关状态
  processingLogs: ProcessingLog[];
  processingStatus: ProcessingStatus;
}

type AppAction =
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_REQUIREMENT'; payload: string }
  | { type: 'SET_TEST_POINTS'; payload: TestPoint[] }
  | { type: 'SET_TEST_POINT_CATEGORIES'; payload: TestPointCategory[] }
  | { type: 'ADD_CUSTOM_TEST_POINT'; payload: TestPoint }
  | { type: 'UPDATE_TEST_POINT'; payload: { index: number; content: string } }
  | { type: 'SET_SELECTED_TEST_POINTS'; payload: string[] }
  | { type: 'SET_TEST_CASES'; payload: TestCase[] }
  | { type: 'SET_SELECTED_TEST_CASES'; payload: TestCase[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TASK_ID'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_SYSTEM'; payload: { id: number; name: string } | null }
  | { type: 'SET_SELECTED_MODULE'; payload: { id: number; name: string } | null }
  | { type: 'SET_SELECTED_SCENARIO'; payload: { id: number; name: string } | null }
  | { type: 'SET_SELECTED_PROVIDER'; payload: string }
  | { type: 'SET_SELECTED_MODEL'; payload: string }
  | { type: 'RESET_SELECTION' }
  | { type: 'RESET_STATE' }
  // 图片上传相关actions
  | { type: 'ADD_UPLOADED_IMAGE'; payload: UploadedImage }
  | { type: 'REMOVE_UPLOADED_IMAGE'; payload: string }
  | { type: 'CLEAR_UPLOADED_IMAGES' }
  | { type: 'SET_VISION_FALLBACK'; payload: boolean }
  | { type: 'SET_SHOW_DESIGN_METHOD'; payload: boolean }
  // 文档解析相关actions
  | { type: 'SET_CURRENT_DOCUMENT'; payload: DocumentUploadResult | null }
  | { type: 'SET_SELECTED_CHAPTERS'; payload: string[] }
  | { type: 'SET_PARSE_MODE'; payload: ParseMode }
  | { type: 'SET_IS_UPLOADING'; payload: boolean }
  | { type: 'CLEAR_DOCUMENT' }
  // 处理日志相关actions
  | { type: 'ADD_PROCESSING_LOG'; payload: ProcessingLog }
  | { type: 'CLEAR_PROCESSING_LOGS' }
  | { type: 'SET_PROCESSING_STATUS'; payload: ProcessingStatus };

const initialState: AppState = {
  sessionId: '',
  currentStep: 1,
  requirement: '',
  testPoints: [],
  testPointCategories: [],
  selectedTestPoints: [],
  testCases: [],
  selectedTestCases: [],
  isLoading: false,
  uploadedImages: [],
  isVisionFallback: false,
  // 文档解析初始状态
  currentDocument: null,
  selectedChapters: [],
  parseMode: 'full',
  isUploading: false,
  processingLogs: [],
  processingStatus: { stage: 'idle', progress: 0, currentStep: '' },
  showDesignMethod: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload as 1 | 2 | 3 };
    case 'SET_REQUIREMENT':
      return { ...state, requirement: action.payload };
    case 'SET_TEST_POINTS':
      return { ...state, testPoints: action.payload };
    case 'SET_TEST_POINT_CATEGORIES':
      return { ...state, testPointCategories: action.payload };
    case 'ADD_CUSTOM_TEST_POINT':
      return { ...state, testPoints: [...state.testPoints, action.payload] };
    case 'UPDATE_TEST_POINT':
      const updatedPoints = [...state.testPoints];
      updatedPoints[action.payload.index] = {
        ...updatedPoints[action.payload.index],
        content: action.payload.content,
        isEditing: false
      };
      return { ...state, testPoints: updatedPoints };
    case 'SET_SELECTED_TEST_POINTS':
      return { ...state, selectedTestPoints: action.payload };
    case 'SET_TEST_CASES':
      return { ...state, testCases: action.payload };
    case 'SET_SELECTED_TEST_CASES':
      return { ...state, selectedTestCases: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_TASK_ID':
      return { ...state, taskId: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SELECTED_SYSTEM':
      return { 
        ...state, 
        selectedSystem: action.payload,
        selectedModule: null,
        selectedScenario: null 
      };
    case 'SET_SELECTED_MODULE':
      return { 
        ...state, 
        selectedModule: action.payload,
        selectedScenario: null 
      };
    case 'SET_SELECTED_SCENARIO':
      return { ...state, selectedScenario: action.payload };
    case 'SET_SELECTED_PROVIDER':
      return { ...state, selectedProvider: action.payload };
    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload };
    case 'RESET_SELECTION':
      return {
        ...state,
        selectedSystem: null,
        selectedModule: null,
        selectedScenario: null
      };
    case 'RESET_STATE':
      return {
        ...initialState,
        sessionId: state.sessionId, // 保持会话ID
      };
    // 图片上传相关reducers
    case 'ADD_UPLOADED_IMAGE':
      return { ...state, uploadedImages: [...state.uploadedImages, action.payload] };
    case 'REMOVE_UPLOADED_IMAGE':
      return {
        ...state,
        uploadedImages: state.uploadedImages.filter((img) => img.id !== action.payload),
      };
    case 'CLEAR_UPLOADED_IMAGES':
      return { ...state, uploadedImages: [], isVisionFallback: false };
    case 'SET_VISION_FALLBACK':
      return { ...state, isVisionFallback: action.payload };
    case 'SET_SHOW_DESIGN_METHOD':
      return { ...state, showDesignMethod: action.payload };
    // 文档解析相关reducers
    case 'SET_CURRENT_DOCUMENT':
      return { ...state, currentDocument: action.payload };
    case 'SET_SELECTED_CHAPTERS':
      return { ...state, selectedChapters: action.payload };
    case 'SET_PARSE_MODE':
      return { ...state, parseMode: action.payload };
    case 'SET_IS_UPLOADING':
      return { ...state, isUploading: action.payload };
    case 'CLEAR_DOCUMENT':
      return {
        ...state,
        currentDocument: null,
        selectedChapters: [],
        parseMode: 'full',
        requirement: '',
      };
    case 'ADD_PROCESSING_LOG':
      return {
        ...state,
        processingLogs: [...state.processingLogs, action.payload],
      };
    case 'CLEAR_PROCESSING_LOGS':
      return {
        ...state,
        processingLogs: [],
        processingStatus: { stage: 'idle', progress: 0, currentStep: '' },
      };
    case 'SET_PROCESSING_STATUS':
      return {
        ...state,
        processingStatus: action.payload,
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
