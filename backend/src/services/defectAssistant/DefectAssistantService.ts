import { QueryRequest, QueryResponse, IntentType, ResultType } from './types';
import { GUIDE_MESSAGE, SUGGESTIONS } from './constants';
import intentParser from './IntentParser';
import entityExtractor from './EntityExtractor';
import queryExecutor from './QueryExecutor';
import logger from '../../utils/logger';

class DefectAssistantService {
  async processQuery(request: QueryRequest): Promise<QueryResponse> {
    const { query } = request;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return this.createGuideResponse('请输入您想查询的内容');
    }

    try {
      logger.info('DefectAssistantService: Processing query', { query });

      const intentResult = intentParser.parseIntent(query);
      const { intent, confidence } = intentResult;

      if (intent === 'unknown') {
        return this.createGuideResponse();
      }

      const entities = await entityExtractor.extractEntities(query, intent);

      // 检查是否有冲突
      let warningMessage = '';
      if (entities.hasConflict && entities.conflictMessages && entities.conflictMessages.length > 0) {
        warningMessage = '\n\n⚠️ 注意：' + entities.conflictMessages.join('；');
        logger.warn('DefectAssistantService: Query has conflicts', { conflicts: entities.conflictMessages, query });
      }

      const result = await queryExecutor.execute(intent, entities);

      const resultType = this.getResultType(intent);

      return {
        success: true,
        message: this.createSuccessMessage(intent, entities) + warningMessage,
        resultType,
        data: result,
        intent: {
          type: intent,
          confidence,
          entities
        },
        suggestions: SUGGESTIONS
      };
    } catch (error) {
      logger.error('DefectAssistantService: Query processing failed', error);
      return {
        success: false,
        message: '查询过程中出现错误，请稍后重试',
        resultType: 'guide',
        suggestions: SUGGESTIONS
      };
    }
  }

  getSuggestions(): string[] {
    return SUGGESTIONS;
  }

  async exportData(query: string): Promise<QueryResponse> {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return {
        success: false,
        message: '请提供有效的查询内容',
        resultType: 'guide'
      };
    }

    try {
      logger.info('DefectAssistantService: Exporting data', { query });

      const intentResult = intentParser.parseIntent(query);
      const intent = intentResult.intent === 'query_my_todo' ? 'query_my_todo' : 'export_data';
      
      const entities = await entityExtractor.extractEntities(query, intent);
      
      let result;
      if (intent === 'query_my_todo') {
        result = await queryExecutor.executeMyTodoExport(entities);
      } else {
        result = await queryExecutor.executeDataExport(entities);
      }

      return {
        success: true,
        message: '数据导出成功',
        resultType: 'list',
        data: result,
        intent: {
          type: intent,
          confidence: 1.0,
          entities
        }
      };
    } catch (error) {
      logger.error('DefectAssistantService: Export failed', error);
      return {
        success: false,
        message: '导出失败，请稍后重试',
        resultType: 'guide'
      };
    }
  }

  private createGuideResponse(customMessage?: string): QueryResponse {
    return {
      success: true,
      message: customMessage || GUIDE_MESSAGE,
      resultType: 'guide',
      suggestions: SUGGESTIONS
    };
  }

  private getResultType(intent: IntentType): ResultType {
    const mapping: Record<IntentType, ResultType> = {
      'query_list': 'list',
      'query_my_todo': 'list',
      'query_trend': 'chart',
      'query_distribution': 'chart',
      'query_count': 'count',
      'generate_document': 'document',
      'export_data': 'list',
      'unknown': 'guide'
    };
    return mapping[intent] || 'guide';
  }

  private createSuccessMessage(intent: IntentType, entities: Record<string, any>): string {
    const projectName = entities['projectName'] || entities['systemName'] || '';
    const statusName = entities['statusName'] || '';
    const timeRangeName = this.getTimeRangeDisplayName(entities['timeRange']);
    const dateFieldName = entities['dateField'] === 'updated_on' ? '更新' : '创建';

    switch (intent) {
      case 'query_list':
        return `已为您找到${projectName}${statusName ? statusName + '的' : ''}问题列表，共查询${timeRangeName}的数据：`;
      case 'query_my_todo':
        return `已为您找到待办事项列表：`;
      case 'query_trend':
        return `已为您生成${projectName || '全部'}问题趋势分析：`;
      case 'query_count':
        if (projectName && timeRangeName && statusName) {
          return `已为您统计${projectName}${timeRangeName}${statusName}问题的数量：`;
        } else if (projectName && timeRangeName) {
          return `已为您统计${projectName}${timeRangeName}问题的数量：`;
        } else if (projectName && statusName) {
          return `已为您统计${projectName}${statusName}问题的数量：`;
        } else if (timeRangeName) {
          return `已为您统计${timeRangeName}问题的数量：`;
        }
        return `已为您统计问题的数量：`;
      case 'query_distribution':
        return `已为您生成${projectName || '全部'}问题分布分析：`;
      case 'generate_document':
        return `正在为您生成分析文档...`;
      case 'export_data':
        return `已为您导出数据：`;
      default:
        return '查询成功';
    }
  }

  private getTimeRangeDisplayName(timeRange?: string): string {
    const names: Record<string, string> = {
      'today': '今天',
      'yesterday': '昨天',
      'day_before_yesterday': '前天',
      'this_week': '本周',
      'this_month': '本月',
      'last_week': '上周',
      'last_month': '上个月',
      'week': '过去一周',
      'month': '过去一个月',
      'quarter': '过去三个月',
      'year': '过去一年',
      'all': ''
    };
    return names[timeRange || 'all'] || '';
  }
}

export default new DefectAssistantService();
