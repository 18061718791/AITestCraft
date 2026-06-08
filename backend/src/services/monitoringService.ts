import { prisma } from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

let isRecordingMetrics = false;

// 监控指标类型
interface Metric {
  id: number;
  metric_name: string;
  metric_value: any;
  metric_type: string;
  timestamp: Date;
  details?: any;
}

// 监控服务类
class MonitoringService {
  // 记录API响应时间
  async recordApiResponseTime(
    endpoint: string,
    responseTime: number,
    method: string,
    statusCode: number
  ): Promise<Metric> {
    return await prisma.system_metrics.create({
      data: {
        metric_name: endpoint,
        metric_value: responseTime,
        metric_type: 'api',
        details: {
          method,
          statusCode
        }
      }
    });
  }

  // 记录数据库性能指标
  async recordDatabaseMetric(
    operation: string,
    executionTime: number,
    query: string
  ): Promise<Metric> {
    return await prisma.system_metrics.create({
      data: {
        metric_name: operation,
        metric_value: executionTime,
        metric_type: 'database',
        details: {
          query
        }
      }
    });
  }

  // 记录内存使用情况
  async recordMemoryUsage(usage: number): Promise<Metric> {
    return await prisma.system_metrics.create({
      data: {
        metric_name: 'memory_usage',
        metric_value: usage,
        metric_type: 'memory'
      }
    });
  }

  // 记录CPU使用情况
  async recordCpuUsage(usage: number): Promise<Metric> {
    return await prisma.system_metrics.create({
      data: {
        metric_name: 'cpu_usage',
        metric_value: usage,
        metric_type: 'cpu'
      }
    });
  }

  // 获取指定时间范围内的指标
  async getMetricsByTimeRange(
    startTime: Date,
    endTime: Date,
    type?: string,
    maxPoints: number = 1000
  ): Promise<Metric[]> {
    const where: any = {
      timestamp: {
        gte: startTime,
        lte: endTime
      }
    };

    if (type) {
      where.metric_type = type;
    }

    // 首先获取总数
    const count = await prisma.system_metrics.count({ where });

    // 如果数据量不大，直接返回所有数据
    if (count <= maxPoints) {
      return await prisma.system_metrics.findMany({
        where,
        orderBy: {
          timestamp: 'asc'
        }
      });
    }

    // 数据量过大时，进行服务器端采样
    const skipInterval = Math.ceil(count / maxPoints);
    
    // 使用原始查询获取采样后的数据
    const metrics = await prisma.system_metrics.findMany({
      where,
      orderBy: {
        timestamp: 'asc'
      }
    });

    // 服务器端采样
    const sampled: Metric[] = [];
    for (let i = 0; i < metrics.length; i += skipInterval) {
      const chunk = metrics.slice(i, Math.min(i + skipInterval, metrics.length));
      if (chunk.length === 0) continue;
      
      const firstItem = chunk[0]!;
      const middleItem = chunk[Math.floor(chunk.length / 2)]!;
      
      // 计算区间平均值
      const avgValue = chunk.reduce((sum, item) => {
        let val: number;
        if (item.metric_value instanceof Decimal) {
          val = parseFloat(item.metric_value.toString());
        } else if (typeof item.metric_value === 'string') {
          val = parseFloat(item.metric_value);
        } else {
          val = Number(item.metric_value);
        }
        return sum + (isNaN(val) ? 0 : val);
      }, 0) / chunk.length;
      
      sampled.push({
        id: firstItem.id,
        metric_name: firstItem.metric_name,
        metric_value: avgValue,
        metric_type: firstItem.metric_type,
        timestamp: middleItem.timestamp,
        details: firstItem.details
      });
    }

    return sampled;
  }

  // 获取最近的指标
  async getRecentMetrics(limit: number, type?: string): Promise<Metric[]> {
    const where: any = {};

    if (type) {
      where.metric_type = type;
    }

    return await prisma.system_metrics.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
  }

  // 获取指标统计信息
  async getMetricsStats(type?: string): Promise<{
    count: number;
    avgValue: number;
    maxValue: number;
    minValue: number;
  }> {
    try {
      let query = `
        SELECT 
          COUNT(*) as count,
          AVG(metric_value) as avgValue,
          MAX(metric_value) as maxValue,
          MIN(metric_value) as minValue
        FROM system_metrics
      `;
      
      if (type) {
        query += ` WHERE metric_type = '${type}'`;
      }

      const result = await prisma.$queryRawUnsafe<Array<{
        count: bigint;
        avgValue: number;
        maxValue: number;
        minValue: number;
      }>>(query);

      if (!result || result.length === 0) {
        return {
          count: 0,
          avgValue: 0,
          maxValue: 0,
          minValue: 0
        };
      }

      const row = result[0]!;
      return {
        count: Number(row.count),
        avgValue: row.avgValue || 0,
        maxValue: row.maxValue || 0,
        minValue: row.minValue || 0
      };
    } catch (error) {
      console.error('Error in getMetricsStats:', error);
      return {
        count: 0,
        avgValue: 0,
        maxValue: 0,
        minValue: 0
      };
    }
  }

  // 清理过期指标
  async cleanupOldMetrics(daysToKeep: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await prisma.system_metrics.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;