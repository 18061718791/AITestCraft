export interface TestPoint {
    id: string;
    content: string;
    selected?: boolean;
}
export interface TestCase {
    number: string;
    module: string;
    title: string;
    description: string;
    precondition: string;
    steps: string[];
    expected_results: string | string[];
    actual_result: string;
    pass_fail: 'Pass' | 'Fail' | '待测试';
    selected?: boolean;
}
export interface GeneratePointsRequest {
    requirement: string;
    sessionId: string;
}
export interface GenerateCasesRequest {
    testPoints: string[];
    sessionId: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
}
export interface WebSocketEvent {
    type: string;
    data: any;
}
export interface PointsGeneratedEvent extends WebSocketEvent {
    type: 'points-generated';
    data: {
        taskId: string;
        points: TestPoint[];
    };
}
export interface CasesGeneratedEvent extends WebSocketEvent {
    type: 'cases-generated';
    data: {
        taskId: string;
        cases: TestCase[];
    };
}
export interface ErrorEvent extends WebSocketEvent {
    type: 'error';
    data: {
        message: string;
        code: string;
    };
}
export interface TaskStatus {
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    result?: any;
    error?: string;
}
export interface TestFlowState {
    currentStep: 1 | 2 | 3;
    requirement: string;
    testPoints: TestPoint[];
    selectedPoints: string[];
    testCases: TestCase[];
    selectedCases: string[];
    loading: {
        generatingPoints: boolean;
        generatingCases: boolean;
    };
    error: string | null;
    sessionId: string;
}
export declare enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    API_ERROR = "API_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR",
    TIMEOUT_ERROR = "TIMEOUT_ERROR",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
export interface AppError extends Error {
    code: ErrorCode;
    details?: any;
}
//# sourceMappingURL=types.d.ts.map