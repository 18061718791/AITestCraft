export type IntentType = 
  | 'query_list'
  | 'query_my_todo'
  | 'query_trend'
  | 'query_distribution'
  | 'query_count'
  | 'generate_document'
  | 'export_data'
  | 'unknown';

export type TimeRange = 'today' | 'yesterday' | 'day_before_yesterday' | 'this_week' | 'this_month' | 'last_week' | 'week_before_last' | 'last_month' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export type ResultType = 'list' | 'chart' | 'count' | 'document' | 'guide';

export type SortField = 'created_on' | 'updated_on';
export type SortDirection = 'asc' | 'desc';

export interface QueryParams {
  projectId?: number;
  projectName?: string;
  systemId?: number;
  systemName?: string;
  moduleId?: number;
  moduleName?: string;
  statusId?: number;
  statusName?: string;
  excludeStatusName?: string;
  excludeStatusNames?: string[];
  priorityId?: number;
  priorityName?: string;
  excludePriorityName?: string;
  assignedToName?: string;
  timeRange?: TimeRange;
  dateField?: 'created_on' | 'updated_on';
  isMyTodo?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: SortField;
  sortDirection?: SortDirection;
  // 组合条件支持
  statusNames?: string[];
  priorityNames?: string[];
  // 冲突检测标记
  hasConflict?: boolean;
  conflictMessages?: string[];
}

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  entities: Partial<QueryParams>;
}

export interface QueryRequest {
  query: string;
  context?: {
    recentQueries?: string[];
  };
}

export interface DefectItem {
  id: number;
  subject: string;
  status_name: string;
  priority_name: string;
  system_module_name: string;
  assigned_to_name?: string;
  created_on: string;
  updated_on: string;
}

export interface TrendData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface DistributionData {
  systemDistribution?: DistributionItem[];
  priorityDistribution?: DistributionItem[];
}

export interface QueryResult {
  list?: DefectItem[];
  total?: number;
  count?: number;
  trendData?: TrendData;
  distributionData?: DistributionData;
  documentUrl?: string;
  taskId?: string;
}

export interface QueryResponse {
  success: boolean;
  message: string;
  resultType: ResultType;
  data?: QueryResult;
  intent?: {
    type: IntentType;
    confidence: number;
    entities: Record<string, any>;
  };
  suggestions?: string[];
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  resultType?: ResultType;
  data?: QueryResult;
}
