import { TestCase, TestPoint } from '../types';
import logger from '../utils/logger';

export interface QualityScore {
  overall: number;
  completeness: number;
  clarity: number;
  coverage: number;
  consistency: number;
  details: QualityDetail[];
}

export interface QualityDetail {
  category: string;
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
}

export interface FeedbackData {
  taskId: string;
  rating: number; // 1-5
  comments?: string;
  issues?: string[];
  improvements?: string[];
}

class QualityService {
  evaluateTestCases(testCases: TestCase[]): QualityScore {
    const details: QualityDetail[] = [];

    // 完整性评估
    const completeness = this.evaluateCompleteness(testCases);
    details.push(completeness);

    // 清晰度评估
    const clarity = this.evaluateClarity(testCases);
    details.push(clarity);

    // 覆盖度评估
    const coverage = this.evaluateCoverage(testCases);
    details.push(coverage);

    // 一致性评估
    const consistency = this.evaluateConsistency(testCases);
    details.push(consistency);

    const overall = Math.round(
      (completeness.score / completeness.maxScore) * 0.3 +
      (clarity.score / clarity.maxScore) * 0.3 +
      (coverage.score / coverage.maxScore) * 0.2 +
      (consistency.score / consistency.maxScore) * 0.2
    ) * 100;

    const result: QualityScore = {
      overall,
      completeness: Math.round((completeness.score / completeness.maxScore) * 100),
      clarity: Math.round((clarity.score / clarity.maxScore) * 100),
      coverage: Math.round((coverage.score / coverage.maxScore) * 100),
      consistency: Math.round((consistency.score / consistency.maxScore) * 100),
      details,
    };

    logger.info('quality_service', 'test_cases_evaluated', {
      caseCount: testCases.length,
      overall: result.overall,
    });

    return result;
  }

  evaluateTestPoints(testPoints: TestPoint[]): QualityScore {
    const details: QualityDetail[] = [];

    const completeness = this.evaluatePointsCompleteness(testPoints);
    details.push(completeness);

    const clarity = this.evaluatePointsClarity(testPoints);
    details.push(clarity);

    const coverage = this.evaluatePointsCoverage(testPoints);
    details.push(coverage);

    const overall = Math.round(
      (completeness.score / completeness.maxScore) * 0.4 +
      (clarity.score / clarity.maxScore) * 0.3 +
      (coverage.score / coverage.maxScore) * 0.3
    ) * 100;

    return {
      overall,
      completeness: Math.round((completeness.score / completeness.maxScore) * 100),
      clarity: Math.round((clarity.score / clarity.maxScore) * 100),
      coverage: Math.round((coverage.score / coverage.maxScore) * 100),
      consistency: 0,
      details,
    };
  }

  private evaluateCompleteness(testCases: TestCase[]): QualityDetail {
    let score = 0;
    const maxScore = testCases.length * 5;
    const issues: string[] = [];
    const suggestions: string[] = [];

    for (const testCase of testCases) {
      let caseScore = 0;
      if (testCase.title && testCase.title.length > 5) caseScore++;
      if (testCase.description && testCase.description.length > 10) caseScore++;
      if (testCase.precondition && testCase.precondition.length > 5) caseScore++;
      if (testCase.steps && testCase.steps.length > 0) caseScore++;
      if (testCase.expected_results && testCase.expected_results.length > 5) caseScore++;
      score += caseScore;

      if (caseScore < 5) {
        issues.push(`用例 "${testCase.title}" 缺少必要字段`);
      }
    }

    if (issues.length > testCases.length * 0.3) {
      suggestions.push('建议补充用例的完整信息，特别是前置条件和预期结果');
    }

    return { category: '完整性', score, maxScore, issues, suggestions };
  }

  private evaluateClarity(testCases: TestCase[]): QualityDetail {
    let score = 0;
    const maxScore = testCases.length * 3;
    const issues: string[] = [];
    const suggestions: string[] = [];

    for (const testCase of testCases) {
      let caseScore = 0;
      if (testCase.title && testCase.title.length >= 10 && testCase.title.length <= 100) caseScore++;
      if (testCase.steps && testCase.steps.every((s) => s.length > 5)) caseScore++;
      if (testCase.expected_results && !testCase.expected_results.includes('等等')) caseScore++;
      score += caseScore;

      if (caseScore < 3) {
        issues.push(`用例 "${testCase.title}" 描述不够清晰`);
      }
    }

    return { category: '清晰度', score, maxScore, issues, suggestions };
  }

  private evaluateCoverage(testCases: TestCase[]): QualityDetail {
    const maxScore = 100;
    let score = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    const categories = new Set(testCases.map((tc) => tc.module));
    if (categories.size >= 3) score += 30;
    else if (categories.size >= 2) score += 20;
    else score += 10;

    const hasPositive = testCases.some((tc) => tc.title.includes('正确') || tc.title.includes('成功'));
    const hasNegative = testCases.some((tc) => tc.title.includes('错误') || tc.title.includes('失败') || tc.title.includes('异常'));
    const hasBoundary = testCases.some((tc) => tc.title.includes('边界') || tc.title.includes('极限') || tc.title.includes('最大') || tc.title.includes('最小'));

    if (hasPositive) score += 20;
    if (hasNegative) score += 20;
    if (hasBoundary) score += 20;

    if (!hasNegative) {
      issues.push('缺少异常场景测试用例');
      suggestions.push('建议增加错误输入、异常流程的测试用例');
    }
    if (!hasBoundary) {
      issues.push('缺少边界条件测试用例');
      suggestions.push('建议增加边界值、极限条件的测试用例');
    }

    return { category: '覆盖度', score, maxScore, issues, suggestions };
  }

  private evaluateConsistency(testCases: TestCase[]): QualityDetail {
    let score = 0;
    const maxScore = 100;
    const issues: string[] = [];
    const suggestions: string[] = [];

    const systems = new Set(testCases.map((tc) => tc.system));
    if (systems.size <= 1) score += 30;
    else issues.push('测试用例所属系统不一致');

    const modules = new Set(testCases.map((tc) => tc.module));
    if (modules.size >= 1 && modules.size <= 5) score += 30;

    const numberFormats = testCases.every((tc) => /^Test\d{4}$/.test(tc.number));
    if (numberFormats) score += 20;
    else issues.push('测试用例编号格式不一致');

    const stepFormats = testCases.every((tc) => Array.isArray(tc.steps));
    if (stepFormats) score += 20;
    else issues.push('测试步骤格式不一致');

    return { category: '一致性', score, maxScore, issues, suggestions };
  }

  private evaluatePointsCompleteness(testPoints: TestPoint[]): QualityDetail {
    let score = 0;
    const maxScore = testPoints.length * 3;
    const issues: string[] = [];
    const suggestions: string[] = [];

    for (const point of testPoints) {
      let pointScore = 0;
      if (point.title && point.title.length > 3) pointScore++;
      if (point.description && point.description.length > 5) pointScore++;
      if (point.priority) pointScore++;
      score += pointScore;

      if (pointScore < 3) {
        issues.push(`测试点 "${point.title}" 信息不完整`);
      }
    }

    return { category: '完整性', score, maxScore, issues, suggestions };
  }

  private evaluatePointsClarity(testPoints: TestPoint[]): QualityDetail {
    let score = 0;
    const maxScore = testPoints.length * 2;
    const issues: string[] = [];
    const suggestions: string[] = [];

    for (const point of testPoints) {
      let pointScore = 0;
      if (point.title && point.title.length >= 5 && point.title.length <= 80) pointScore++;
      if (point.content && point.content.length > 10) pointScore++;
      score += pointScore;

      if (pointScore < 2) {
        issues.push(`测试点 "${point.title}" 描述不够清晰`);
      }
    }

    return { category: '清晰度', score, maxScore, issues, suggestions };
  }

  private evaluatePointsCoverage(testPoints: TestPoint[]): QualityDetail {
    const maxScore = 100;
    let score = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    const priorities = new Set(testPoints.map((p) => p.priority));
    if (priorities.size >= 2) score += 30;

    const categories = new Set(testPoints.map((p) => p.category));
    if (categories.size >= 2) score += 30;

    const hasFunctional = testPoints.some((p) => p.category === 'functional');
    const hasBoundary = testPoints.some((p) => p.title.includes('边界') || p.title.includes('极限'));
    const hasError = testPoints.some((p) => p.title.includes('错误') || p.title.includes('异常'));

    if (hasFunctional) score += 20;
    if (hasBoundary) score += 10;
    if (hasError) score += 10;

    if (!hasBoundary) {
      issues.push('缺少边界条件测试点');
      suggestions.push('建议增加边界值测试点');
    }
    if (!hasError) {
      issues.push('缺少异常场景测试点');
      suggestions.push('建议增加异常流程测试点');
    }

    return { category: '覆盖度', score, maxScore, issues, suggestions };
  }

  calculateFeedbackScore(feedback: FeedbackData): number {
    const baseScore = feedback.rating * 20; // 20-100
    const issuePenalty = (feedback.issues?.length || 0) * 5;
    const improvementBonus = (feedback.improvements?.length || 0) * 2;

    return Math.max(0, Math.min(100, baseScore - issuePenalty + improvementBonus));
  }
}

export const qualityService = new QualityService();
