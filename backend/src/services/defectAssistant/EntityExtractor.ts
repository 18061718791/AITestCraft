import { QueryParams, IntentType } from './types';
import { STATUS_KEYWORDS, PRIORITY_KEYWORDS, TIME_RANGE_KEYWORDS, SORT_FIELD_KEYWORDS, SORT_DIRECTION_KEYWORDS, ASSIGNED_TO_KEYWORDS, DEFAULT_QUERY_PARAMS } from './constants';
import mysqlProjectMappingService from '../intelligentQa/MySQLProjectMappingService';
import { prisma } from '../../utils/prisma';
import logger from '../../utils/logger';

class EntityExtractor {
  async extractEntities(query: string, intent: IntentType): Promise<QueryParams> {
    const params: QueryParams = { ...DEFAULT_QUERY_PARAMS };

    if (!query || typeof query !== 'string') {
      return params;
    }

    const normalizedQuery = query.toLowerCase().trim();

    this.extractMyTodoEntity(normalizedQuery, params, intent);
    await this.extractProjectEntity(normalizedQuery, params);
    await this.extractSystemEntity(normalizedQuery, params);
    this.extractStatusEntity(query, params, intent);
    this.extractPriorityEntity(normalizedQuery, params);
    this.extractAssignedToEntity(query, params);
    this.extractTimeRangeEntity(query, params);
    this.extractSortEntity(query, params);
    
    // 执行冲突检测
    this.detectConflicts(params, query);

    logger.info('EntityExtractor: Extracted entities', { query, intent, params });

    return params;
  }

  private extractMyTodoEntity(query: string, params: QueryParams, intent: IntentType): void {
    if (intent === 'query_my_todo') {
      params.isMyTodo = true;
    }
  }

  private async extractProjectEntity(query: string, params: QueryParams): Promise<void> {
    const projectKeywords = ['智能物联', '物联项目', 'aitestcraft'];
    
    for (const keyword of projectKeywords) {
      const lowerQuery = query.toLowerCase();
      const lowerKeyword = keyword.toLowerCase();
      
      if (lowerQuery.includes(lowerKeyword)) {
        try {
          // 项目存储在 projects 表中
          const project = await prisma.projects.findFirst({
            where: {
              name: { contains: keyword }
            }
          });
          
          if (project) {
            // project.id 就是 parent_id，用于在 directories 表中查找子目录
            params.projectId = parseInt(project.id);
            params.projectName = project.name;
            logger.info(`EntityExtractor: Found project "${project.name}" (id=${project.id}) for keyword "${keyword}"`);
            return;
          } else {
            logger.warn(`EntityExtractor: No project found with keyword "${keyword}" in projects table`);
          }
        } catch (error) {
          logger.warn(`Failed to get project by name ${keyword}`, error);
        }
      }
    }
  }

  private async extractSystemEntity(query: string, params: QueryParams): Promise<void> {
    const systemKeywords = ['低代码', '物联应用', '物联平台', '大数据平台'];
    
    for (const keyword of systemKeywords) {
      const lowerQuery = query.toLowerCase();
      const lowerKeyword = keyword.toLowerCase();
      
      if (lowerQuery.includes(lowerKeyword)) {
        try {
          const directory = await prisma.directories.findFirst({
            where: {
              name: { contains: keyword },
              level: 1
            }
          });
          
          if (directory) {
            params.systemId = parseInt(directory.id);
            params.systemName = directory.name;
            logger.info(`EntityExtractor: Found system "${directory.name}" (id=${directory.id}) for keyword "${keyword}"`);
            return;
          } else {
            logger.warn(`EntityExtractor: No system found with keyword "${keyword}" at level 1`);
          }
        } catch (error) {
          logger.warn(`Failed to get system by name ${keyword}`, error);
        }
      }
    }
  }

  private extractStatusEntity(query: string, params: QueryParams, intent?: IntentType): void {
    const normalizedQuery = query.toLowerCase();
    
    // ========== 1. 否定语义识别（优先级最高）==========
    this.extractNegativeStatus(normalizedQuery, params);
    
    // ========== 2. 组合条件识别（OR条件）==========
    this.extractCombinedStatus(normalizedQuery, params);
    
    // ========== 3. 明确的状态表达 ==========
    const explicitStatusPatterns = [
      /状态[为是]\s*新建/,
      /状态[为是]\s*进行中/,
      /状态[为是]\s*已解决/,
      /状态[为是]\s*已关闭/
    ];
    
    for (const pattern of explicitStatusPatterns) {
      const match = query.match(pattern);
      if (match) {
        const statusText = match[0];
        for (const [keyword, statusName] of Object.entries(STATUS_KEYWORDS)) {
          if (statusText.includes(keyword.toLowerCase())) {
            this.setStatus(params, statusName);
            logger.debug('EntityExtractor: Extracted explicit status', { statusName, query });
            return;
          }
        }
      }
    }
    
    // ========== 4. 动词上下文检查 ==========
    const verbPatterns = [
      /新[建创]\s*的/,
      /创建\s*的/,
      /新提交\s*的/
    ];
    
    const isVerbContext = verbPatterns.some(pattern => pattern.test(query));
    
    if (isVerbContext) {
      logger.debug('EntityExtractor: "新建/创建" detected as verb, not status');
      return;
    }
    
    // ========== 5. 常规状态关键词匹配 ==========
    for (const [keyword, statusName] of Object.entries(STATUS_KEYWORDS)) {
      if (query.includes(keyword.toLowerCase())) {
        this.setStatus(params, statusName);
        return;
      }
    }

    // ========== 6. 统计查询特殊处理 ==========
    if (intent === 'query_count') {
      const countPatterns = [
        { pattern: /上周新[建创]/, statusName: '新建' },
        { pattern: /本月新[建创]/, statusName: '新建' },
        { pattern: /上周创建/, statusName: '新建' },
        { pattern: /本月创建/, statusName: '新建' }
      ];
      
      for (const { pattern, statusName } of countPatterns) {
        if (pattern.test(query)) {
          this.setStatus(params, statusName);
          params.dateField = 'created_on';
          logger.debug('EntityExtractor: Extracted status from count query', { statusName, query });
          return;
        }
      }
    }
  }

  /**
   * 提取否定语义状态
   * 支持：除...外、不包括、不包含、非、排除、不要、不是、未、没
   */
  private extractNegativeStatus(query: string, params: QueryParams): void {
    // 多状态排除模式："除了已关闭和已解决的"
    const multiExcludePattern = /(?:除|除了|除去|排除)(.+?)(?:和|与|、|,)(.+?)(?:外|的|问题|$)/;
    const multiMatch = query.match(multiExcludePattern);
    if (multiMatch && multiMatch[1] && multiMatch[2]) {
      const excludedStatuses: string[] = [];
      const text1 = multiMatch[1].trim();
      const text2 = multiMatch[2].trim();
      
      for (const [keyword, statusName] of Object.entries(STATUS_KEYWORDS)) {
        if (text1.includes(keyword.toLowerCase()) && !excludedStatuses.includes(statusName)) {
          excludedStatuses.push(statusName);
        }
        if (text2.includes(keyword.toLowerCase()) && !excludedStatuses.includes(statusName)) {
          excludedStatuses.push(statusName);
        }
      }
      
      if (excludedStatuses.length > 0) {
        params.excludeStatusNames = excludedStatuses;
        logger.debug('EntityExtractor: Extracted multiple excluded statuses', { excludedStatuses, query });
        return;
      }
    }

    // 单状态否定模式
    const negativePatterns = [
      { pattern: /除(.+?)外/, type: 'exclude' },
      { pattern: /不包括(.+?)(?:的|问题|$)/, type: 'exclude' },
      { pattern: /不包含(.+?)(?:的|问题|$)/, type: 'exclude' },
      { pattern: /非(.+?)(?:状态|的|问题|$)/, type: 'exclude' },
      { pattern: /排除(.+?)(?:的|问题|$)/, type: 'exclude' },
      { pattern: /不要(.+?)(?:的|问题|$)/, type: 'exclude' },
      { pattern: /不是(.+?)(?:状态|的|问题|$)/, type: 'exclude' },
      { pattern: /未(.+?)(?:的|问题|$)/, type: 'exclude' },
      { pattern: /没(.+?)(?:的|问题|$)/, type: 'exclude' }
    ];
    
    for (const { pattern, type } of negativePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const excludedText = match[1].trim();
        for (const [keyword, statusName] of Object.entries(STATUS_KEYWORDS)) {
          if (excludedText.includes(keyword.toLowerCase())) {
            if (type === 'exclude') {
              params.excludeStatusName = statusName;
              logger.debug('EntityExtractor: Extracted excluded status', { statusName, query });
            }
            return;
          }
        }
      }
    }
  }

  /**
   * 提取组合状态条件（OR）
   * 支持：或、和、与、,
   */
  private extractCombinedStatus(query: string, params: QueryParams): void {
    // 组合状态模式："状态为新建或进行中"
    const combinedPatterns = [
      /状态[为是](.+?)(?:或|和|与|、|,)(.+?)(?:的|问题|$)/,
      /(.+?)(?:或|和|与|、|,)(.+?)状态/,
      /(.+?)(?:或|和|与|、|,)(.+?)的问题/
    ];
    
    for (const pattern of combinedPatterns) {
      const match = query.match(pattern);
      if (match && match[1] && match[2]) {
        const text1 = match[1].trim();
        const text2 = match[2].trim();
        const statuses: string[] = [];
        
        for (const [keyword, statusName] of Object.entries(STATUS_KEYWORDS)) {
          if ((text1.includes(keyword.toLowerCase()) || text2.includes(keyword.toLowerCase())) 
              && !statuses.includes(statusName)) {
            statuses.push(statusName);
          }
        }
        
        if (statuses.length > 1) {
          params.statusNames = statuses;
          // 设置主状态为第一个
          params.statusName = statuses[0] || '';
          logger.debug('EntityExtractor: Extracted combined statuses', { statuses, query });
          return;
        }
      }
    }
  }

  /**
   * 设置状态并自动判断日期字段
   */
  private setStatus(params: QueryParams, statusName: string): void {
    params.statusName = statusName;
    if (statusName === '已关闭' || statusName === '已解决') {
      params.dateField = 'updated_on';
    }
  }

  /**
   * 冲突检测
   */
  private detectConflicts(params: QueryParams, query: string): void {
    const conflicts: string[] = [];

    // 1. 检查状态和排除状态冲突
    if (params.statusName && params.excludeStatusName) {
      if (params.statusName === params.excludeStatusName) {
        conflicts.push(`查询条件矛盾：同时要求"${params.statusName}"和"排除${params.excludeStatusName}"`);
      }
    }

    // 2. 检查状态和排除状态列表冲突
    if (params.statusName && params.excludeStatusNames) {
      if (params.excludeStatusNames.includes(params.statusName)) {
        conflicts.push(`查询条件矛盾：要求"${params.statusName}"状态但又在排除列表中`);
      }
    }

    // 3. 检查优先级冲突
    if (params.priorityName && params.excludePriorityName) {
      if (params.priorityName === params.excludePriorityName) {
        conflicts.push(`查询条件矛盾：同时要求"${params.priorityName}"优先级和"排除${params.excludePriorityName}"优先级`);
      }
    }

    // 4. 检查时间范围冲突
    if (params.timeRange) {
      const timeKeywords = ['今天', '昨天', '本周', '上周', '本月', '上个月'];
      const matchedTimes = timeKeywords.filter(kw => query.includes(kw));
      if (matchedTimes.length > 1) {
        conflicts.push(`时间范围可能冲突：同时包含 ${matchedTimes.join('、')}`);
      }
    }

    if (conflicts.length > 0) {
      params.hasConflict = true;
      params.conflictMessages = conflicts;
      logger.warn('EntityExtractor: Detected conflicts', { conflicts, query });
    }
  }

  private extractPriorityEntity(query: string, params: QueryParams): void {
    // 否定优先级
    const negativePatterns = [
      /(?:除|除了|除去|排除|不包括|不包含|非|不要|不是|没)(.+?)优先级/,
      /(?:除|除了|除去|排除|不包括|不包含|非|不要|不是|没)(.+?)(?:的|问题|$)/
    ];
    
    for (const pattern of negativePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const excludedText = match[1].trim();
        for (const [keyword, priorityName] of Object.entries(PRIORITY_KEYWORDS)) {
          if (excludedText.includes(keyword.toLowerCase())) {
            params.excludePriorityName = priorityName;
            logger.debug('EntityExtractor: Extracted excluded priority', { priorityName, query });
            return;
          }
        }
      }
    }

    // 组合优先级
    const combinedPattern = /(.+?)(?:或|和|与|、|,)(.+?)优先级/;
    const combinedMatch = query.match(combinedPattern);
    if (combinedMatch && combinedMatch[1] && combinedMatch[2]) {
      const text1 = combinedMatch[1].trim();
      const text2 = combinedMatch[2].trim();
      const priorities: string[] = [];
      
      for (const [keyword, priorityName] of Object.entries(PRIORITY_KEYWORDS)) {
        if ((text1.includes(keyword.toLowerCase()) || text2.includes(keyword.toLowerCase())) 
            && !priorities.includes(priorityName)) {
          priorities.push(priorityName);
        }
      }
      
      if (priorities.length > 1) {
        params.priorityNames = priorities;
        params.priorityName = priorities[0] || '';
        logger.debug('EntityExtractor: Extracted combined priorities', { priorities, query });
        return;
      }
    }

    // 常规优先级匹配
    for (const [keyword, priorityName] of Object.entries(PRIORITY_KEYWORDS)) {
      if (query.includes(keyword.toLowerCase())) {
        params.priorityName = priorityName;
        return;
      }
    }
  }

  private extractAssignedToEntity(query: string, params: QueryParams): void {
    for (const [keyword, value] of Object.entries(ASSIGNED_TO_KEYWORDS)) {
      if (query.includes(keyword)) {
        if (value === 'me') {
          const todoAssignedToId = process.env['TODO_ASSIGNED_TO_ID'] || '130';
          params.assignedToName = todoAssignedToId;
        }
        return;
      }
    }
  }

  private extractTimeRangeEntity(query: string, params: QueryParams): void {
    const normalizedQuery = query.toLowerCase();
    
    // 按优先级排序的关键词列表（长的、具体的优先）
    const sortedKeywords = Object.entries(TIME_RANGE_KEYWORDS).sort((a, b) => {
      // 优先匹配更长的关键词（避免"本月"匹配到"上个月"）
      if (a[0].length !== b[0].length) {
        return b[0].length - a[0].length;
      }
      // 相同长度时，"上个"、"上个"等前缀优先于"本"、"这"
      const aHasPrefix = a[0].startsWith('上个') || a[0].startsWith('上周') || a[0].startsWith('昨天');
      const bHasPrefix = b[0].startsWith('上个') || b[0].startsWith('上周') || b[0].startsWith('昨天');
      if (aHasPrefix && !bHasPrefix) return -1;
      if (!aHasPrefix && bHasPrefix) return 1;
      return 0;
    });
    
    for (const [keyword, timeRange] of sortedKeywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        params.timeRange = timeRange;
        logger.debug('EntityExtractor: Extracted time range', { keyword, timeRange, query });
        return;
      }
    }
  }

  private extractSortEntity(query: string, params: QueryParams): void {
    for (const [keyword, sortField] of Object.entries(SORT_FIELD_KEYWORDS)) {
      if (query.includes(keyword)) {
        params.sortBy = sortField;
        break;
      }
    }

    for (const [keyword, sortDirection] of Object.entries(SORT_DIRECTION_KEYWORDS)) {
      if (query.includes(keyword)) {
        params.sortDirection = sortDirection;
        return;
      }
    }
  }
}

export default new EntityExtractor();
