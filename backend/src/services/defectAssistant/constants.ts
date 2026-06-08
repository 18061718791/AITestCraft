import { IntentType, TimeRange, SortField, SortDirection } from './types';

export const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  query_list: ['列表', '清单', '查看', '查询', '获取', '问题', '缺陷', 'bug', '查看问题', '查看缺陷'],
  query_my_todo: ['我的待办', '待办', '待处理', '需要我处理', '分配给我', '我负责', '我的任务', '待办事项', '我需要处理'],
  query_trend: ['趋势', '变化', '折线', '走势', '趋势分析', '趋势图'],
  query_distribution: ['分布', '占比', '饼图', '比例', '分布分析', '分布图'],
  query_count: ['数量', '多少', '统计', '有多少', '几个', '查看数量', '查询数量'],
  generate_document: ['文档', '报告', 'PPT', 'Word', '生成文档', '生成报告'],
  export_data: ['导出', '下载', 'Excel', '导出数据', '下载数据'],
  unknown: []
};

export const STATUS_KEYWORDS: Record<string, string> = {
  '已解决': '已解决',
  '解决': '已解决',
  '已处理': '已解决',
  '已完成': '已解决',
  '状态为新建': '新建',
  '新建状态': '新建',
  '状态是新建': '新建',
  '进行中': '进行中',
  '处理中': '进行中',
  '解决中': '进行中',
  '已关闭': '已关闭',
  '关闭': '已关闭',
  '已归档': '已关闭'
};

export const PRIORITY_KEYWORDS: Record<string, string> = {
  '紧急': '紧急',
  '高优先级': '紧急',
  '严重': '紧急',
  '重要': '紧急',
  '一般': '一般',
  '低优先级': '一般',
  '普通': '一般',
  '常规': '一般'
};

export const TIME_RANGE_KEYWORDS: Record<string, TimeRange> = {
  '今天': 'today',
  '今日': 'today',
  '当天': 'today',
  '本日': 'today',
  '昨天': 'yesterday',
  '昨日': 'yesterday',
  '前天': 'day_before_yesterday',
  '大前天': 'day_before_yesterday',
  '本周': 'this_week',
  '这周': 'this_week',
  '当前周': 'this_week',
  '上周': 'last_week',
  '上上周': 'week_before_last',
  '过去一周': 'week',
  '最近一周': 'week',
  '近一周': 'week',
  '过去7天': 'week',
  '最近7天': 'week',
  '本月': 'this_month',
  '这个月': 'this_month',
  '当前月': 'this_month',
  '上个月': 'last_month',
  '上月': 'last_month',
  '过去一个月': 'month',
  '最近一个月': 'month',
  '近一个月': 'month',
  '过去30天': 'month',
  '最近30天': 'month',
  '过去三个月': 'quarter',
  '最近三个月': 'quarter',
  '近三个月': 'quarter',
  '过去90天': 'quarter',
  '最近90天': 'quarter',
  '今年': 'year',
  '过去一年': 'year',
  '最近一年': 'year',
  '近一年': 'year',
  '过去365天': 'year',
  '最近365天': 'year',
  '全部': 'all',
  '所有': 'all',
  '全部数据': 'all'
};

export const SORT_FIELD_KEYWORDS: Record<string, SortField> = {
  '创建时间': 'created_on',
  '创建日期': 'created_on',
  '创建': 'created_on',
  '更新时间': 'updated_on',
  '更新日期': 'updated_on',
  '更新': 'updated_on',
  '修改时间': 'updated_on',
  '修改日期': 'updated_on'
};

export const ASSIGNED_TO_KEYWORDS: Record<string, string> = {
  '分配给我': 'me',
  '我的': 'me',
  '我负责的': 'me',
  '我处理的': 'me'
};

export const SORT_DIRECTION_KEYWORDS: Record<string, SortDirection> = {
  '倒序': 'desc',
  '降序': 'desc',
  '从大到小': 'desc',
  '从新到旧': 'desc',
  '最新': 'desc',
  '正序': 'asc',
  '升序': 'asc',
  '从小到大': 'asc',
  '从旧到新': 'asc',
  '最早': 'asc'
};

export const DEFAULT_QUERY_PARAMS = {
  timeRange: 'all' as TimeRange,
  page: 1,
  pageSize: 20
};

export const GUIDE_MESSAGE = `我理解您想查询缺陷相关数据，请尝试以下方式：

**查询问题列表：**
- "查看物联应用已解决的问题"
- "获取低代码系统的问题列表"

**查看我的待办：**
- "查看我的待办"
- "需要我处理的问题"

**查看趋势分析：**
- "物联平台问题趋势分析"
- "查看问题变化趋势"

**查看分布分析：**
- "问题分布分析"
- "查看系统分布情况"

**生成报告：**
- "生成物联平台问题分析报告"`;

export const SUGGESTIONS = [
  '查看我的待办',
  '查看物联应用已解决的问题',
  '物联平台问题趋势分析',
  '问题分布分析',
  '生成问题分析报告'
];
