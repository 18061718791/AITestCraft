import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TestCase } from '../types';

export interface AppState {
  sessionId: string;
  currentStep: 1 | 2 | 3;
  requirement: string;
  testPoints: string[];
  selectedTestPoints: string[];
  testCases: TestCase[];
  selectedTestCases: TestCase[];
  isLoading: boolean;
  taskId?: string;
  error?: string;
}

type AppAction =
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_CURRENT_STEP'; payload: 1 | 2 | 3 }
  | { type: 'SET_REQUIREMENT'; payload: string }
  | { type: 'SET_TEST_POINTS'; payload: string[] }
  | { type: 'SET_SELECTED_TEST_POINTS'; payload: string[] }
  | { type: 'SET_TEST_CASES'; payload: TestCase[] }
  | { type: 'SET_SELECTED_TEST_CASES'; payload: TestCase[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TASK_ID'; payload?: string }
  | { type: 'SET_ERROR'; payload?: string }
  | { type: 'RESET' };

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
      return { ...state, currentStep: action.payload };
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
    case 'RESET':
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