import { IntentType, IntentResult } from './types';
import { INTENT_KEYWORDS } from './constants';
import logger from '../../utils/logger';

const INTENT_PRIORITY: IntentType[] = [
  'generate_document',
  'export_data',
  'query_my_todo',
  'query_trend',
  'query_distribution',
  'query_count',
  'query_list',
  'unknown'
];

class IntentParser {
  parseIntent(query: string): IntentResult {
    if (!query || typeof query !== 'string') {
      return {
        intent: 'unknown',
        confidence: 0,
        entities: {}
      };
    }

    const normalizedQuery = this.normalizeQuery(query);
    
    const priorityResult = this.matchByPriorityPatterns(normalizedQuery);
    if (priorityResult.confidence >= 0.8) {
      logger.info(`IntentParser: Priority pattern match found`, { 
        query: normalizedQuery, 
        intent: priorityResult.intent, 
        confidence: priorityResult.confidence 
      });
      return priorityResult;
    }

    const keywordResult = this.matchByKeywords(normalizedQuery);
    if (keywordResult.confidence >= 0.7) {
      logger.info(`IntentParser: Keyword match found`, { 
        query: normalizedQuery, 
        intent: keywordResult.intent, 
        confidence: keywordResult.confidence 
      });
      return keywordResult;
    }

    return keywordResult.intent !== 'unknown' ? keywordResult : {
      intent: 'unknown',
      confidence: 0.3,
      entities: {}
    };
  }

  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }

  private matchByPriorityPatterns(query: string): IntentResult {
    const priorityPatterns = [
      { 
        patterns: [['我的待办', '待办', '待处理', '需要我处理', '分配给我', '我负责', '我的任务', '待办事项', '我需要处理'], ['查看', '查询', '获取', '显示', '列出', '']], 
        intent: 'query_my_todo' as IntentType,
        priority: 1
      },
      { 
        patterns: [['趋势分析', '趋势图', '变化趋势'], ['问题', '缺陷', 'bug']], 
        intent: 'query_trend' as IntentType,
        priority: 1
      },
      { 
        patterns: [['趋势', '变化', '折线', '走势'], ['分析', '图']], 
        intent: 'query_trend' as IntentType,
        priority: 2
      },
      { 
        patterns: [['分布分析', '分布图', '占比分析'], ['问题', '缺陷', 'bug']], 
        intent: 'query_distribution' as IntentType,
        priority: 1
      },
      { 
        patterns: [['分布', '占比', '饼图', '比例'], ['分析', '图']], 
        intent: 'query_distribution' as IntentType,
        priority: 2
      },
      { 
        patterns: [['数量', '多少', '几个'], ['问题', '缺陷', 'bug']], 
        intent: 'query_count' as IntentType,
        priority: 1
      },
      { 
        patterns: [['生成', '创建', '导出'], ['文档', '报告', 'PPT', 'Word']], 
        intent: 'generate_document' as IntentType,
        priority: 1
      },
      { 
        patterns: [['导出', '下载'], ['数据', 'excel', 'Excel']], 
        intent: 'export_data' as IntentType,
        priority: 1
      },
      { 
        patterns: [['问题列表', '缺陷列表', 'bug列表'], ['查看', '获取', '查询']], 
        intent: 'query_list' as IntentType,
        priority: 1
      },
      { 
        patterns: [['列表', '清单'], ['问题', '缺陷', 'bug']], 
        intent: 'query_list' as IntentType,
        priority: 2
      }
    ];

    for (const { patterns, intent, priority } of priorityPatterns) {
      const firstGroup = patterns[0];
      const secondGroup = patterns[1];
      if (!firstGroup || !secondGroup) continue;
      
      const firstGroupMatch = firstGroup.some(p => query.includes(p.toLowerCase()));
      const secondGroupMatch = secondGroup.some(p => query.includes(p.toLowerCase()));
      
      if (firstGroupMatch && secondGroupMatch) {
        const confidence = priority === 1 ? 0.95 : 0.85;
        return {
          intent,
          confidence,
          entities: {}
        };
      }
    }

    return {
      intent: 'unknown',
      confidence: 0,
      entities: {}
    };
  }

  private matchByKeywords(query: string): IntentResult {
    const scores: { intent: IntentType; score: number }[] = [];

    for (const intent of INTENT_PRIORITY) {
      if (intent === 'unknown') continue;
      
      const keywords = INTENT_KEYWORDS[intent];
      if (!keywords) continue;

      const matchCount = keywords.filter(keyword => 
        query.includes(keyword.toLowerCase())
      ).length;

      if (matchCount > 0) {
        scores.push({ intent, score: matchCount });
      }
    }

    if (scores.length === 0) {
      return {
        intent: 'unknown',
        confidence: 0,
        entities: {}
      };
    }

    scores.sort((a, b) => {
      const priorityA = INTENT_PRIORITY.indexOf(a.intent);
      const priorityB = INTENT_PRIORITY.indexOf(b.intent);
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return priorityA - priorityB;
    });

    const best = scores[0];
    const confidence = Math.min(0.5 + (best!.score * 0.15), 0.9);

    return {
      intent: best!.intent,
      confidence,
      entities: {}
    };
  }
}

export default new IntentParser();
