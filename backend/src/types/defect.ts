// 目录树节点类型
export interface DefectTreeNode {
  id: number;
  name: string;
  issueCount?: number;
  children?: DefectTreeNode[];
}

// 缺陷类型
export interface Defect {
  id: number;
  subject: string;
  description: string | null;
  status_id: number;
  status_name: string;
  priority_id: number;
  priority_name: string;
  author_id: number;
  assigned_to_id?: number;
  assigned_to_name?: string;
  created_on: string;
  updated_on: string;
  parent_id: number | null;
  parent_subject: string | null;
  project_id: number;
  system_module_name?: string;
}

// 缺陷列表响应类型
export interface DefectListResponse {
  list: Defect[];
  total: number;
  page: number;
  pageSize: number;
}

// 趋势数据类型
export interface TrendData {
  labels: string[];
  datasets: TrendDataset[];
}

export interface TrendDataset {
  label: string;
  data: number[];
}

// 分布数据类型
export interface DistributionData {
  name: string;
  value: number;
}

// 查询参数类型
export interface DefectQueryParams {
  page?: number;
  pageSize?: number;
  id?: number;
  subject?: string;
  status_id?: string;
  exclude_status_id?: string;
  exclude_status_ids?: string[];
  priority_id?: string;
  exclude_priority_id?: string;
  parent_id?: number;
  startDate?: string;
  endDate?: string;
  updatedStartDate?: string;
  updatedEndDate?: string;
  system_id?: string;
  module_id?: string;
  project_id?: string;
  assigned_to_name?: string;
  assigned_to_id?: number | number[];
  sort_by?: string;
  sort_direction?: string;
  is_todo?: boolean;
  userId?: number;
  isAdmin?: boolean;
}

// 统计查询参数类型
export interface StatisticsQueryParams {
  type?: 'all' | 'urgent';
  systemId?: number;
  days?: number;
}

// 目录类型
export interface Directory {
  id: string;
  name: string;
  parent_id?: string;
  level: number;
  project_id?: string;
}