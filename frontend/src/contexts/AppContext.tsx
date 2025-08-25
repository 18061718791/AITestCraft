import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TestCase, TestPoint } from '../types';

export interface AppState {
  sessionId: string;
  currentStep: 1 | 2 | 3;
  requirement: string;
  testPoints: TestPoint[];
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
}

type AppAction =
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_REQUIREMENT'; payload: string }
  | { type: 'SET_TEST_POINTS'; payload: TestPoint[] }
  | { type: 'SET_SELECTED_TEST_POINTS'; payload: string[] }
  | { type: 'SET_TEST_CASES'; payload: TestCase[] }
  | { type: 'SET_SELECTED_TEST_CASES'; payload: TestCase[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TASK_ID'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_SYSTEM'; payload: { id: number; name: string } | null }
  | { type: 'SET_SELECTED_MODULE'; payload: { id: number; name: string } | null }
  | { type: 'SET_SELECTED_SCENARIO'; payload: { id: number; name: string } | null }
  | { type: 'RESET_SELECTION' }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  sessionId: '',
  currentStep: 1,
  requirement: '',
  testPoints: [],
  selectedTestPoints: [],
  testCases: [],
  selectedTestCases: [],
  isLoading: false,
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