import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Space, Typography, Statistic, Row, Col, Button, Empty, App } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const { Text } = Typography;

interface Metric {
  id: number;
  metric_name: string;
  metric_value: number;
  metric_type: string;
  timestamp: string;
  details?: any;
}

interface MetricStats {
  count: number;
  avgValue: number;
  maxValue: number;
  minValue: number;
}

// 数据采样函数 - 将大量数据点采样为固定点数
const sampleData = (data: Metric[], maxPoints: number = 100): Metric[] => {
  if (data.length <= maxPoints) return data;
  
  const sampled: Metric[] = [];
  const step = Math.ceil(data.length / maxPoints);
  
  for (let i = 0; i < data.length; i += step) {
    // 对每个区间取平均值
    const chunk = data.slice(i, Math.min(i + step, data.length));
    const avgValue = chunk.reduce((sum, item) => sum + item.metric_value, 0) / chunk.length;
    
    sampled.push({
      ...chunk[0],
      metric_value: Math.round(avgValue * 100) / 100,
      timestamp: chunk[Math.floor(chunk.length / 2)].timestamp // 取中间点的时间
    });
  }
  
  return sampled;
};

// 格式化时间戳显示
const formatTimestamp = (timestamp: string, timeRange: string): string => {
  const date = new Date(timestamp);
  if (timeRange === '24h') {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit' });
  }
};

const SystemMonitoringPage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [stats, setStats] = useState<MetricStats>({
    count: 0,
    avgValue: 0,
    maxValue: 0,
    minValue: 0
  });
  const [timeRange, setTimeRange] = useState<string>('24h');

  // 获取系统监控指标
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // 计算时间范围
      const endTime = new Date();
      const startTime = new Date();
      if (timeRange === '24h') {
        startTime.setHours(startTime.getHours() - 24);
      } else if (timeRange === '7d') {
        startTime.setDate(startTime.getDate() - 7);
      } else if (timeRange === '30d') {
        startTime.setDate(startTime.getDate() - 30);
      }

      const response = await axios.get('/api/admin/metrics', {
        params: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        }
      });
      setMetrics(response.data.data);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取监控指标失败');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // 获取系统监控统计
  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/metrics/stats');
      setStats(response.data.data);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取监控统计失败');
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchStats();
  }, [fetchMetrics]);

  // 处理时间范围变化
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
  };

  // 清理过期数据
  const handleCleanup = async () => {
    try {
      await axios.post('/api/admin/metrics/cleanup', {
        daysToKeep: 30
      });
      message.success('过期监控数据已清理');
      fetchMetrics();
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.error || '清理监控数据失败');
    }
  };

  // 准备图表数据 - 使用useMemo缓存并采样数据
  const chartData = useMemo(() => {
    // 按类型分组
    const apiMetricsRaw = metrics.filter(m => m.metric_type === 'api');
    const dbMetricsRaw = metrics.filter(m => m.metric_type === 'database');
    const memoryMetricsRaw = metrics.filter(m => m.metric_type === 'memory');
    const cpuMetricsRaw = metrics.filter(m => m.metric_type === 'cpu');

    // 对数据进行采样，限制每个图表最多100个点
    const apiMetrics = sampleData(apiMetricsRaw, 100).map(m => ({
      ...m,
      timestamp: formatTimestamp(m.timestamp, timeRange)
    }));
    const dbMetrics = sampleData(dbMetricsRaw, 100).map(m => ({
      ...m,
      timestamp: formatTimestamp(m.timestamp, timeRange)
    }));
    const memoryMetrics = sampleData(memoryMetricsRaw, 100).map(m => ({
      ...m,
      timestamp: formatTimestamp(m.timestamp, timeRange)
    }));
    const cpuMetrics = sampleData(cpuMetricsRaw, 100).map(m => ({
      ...m,
      timestamp: formatTimestamp(m.timestamp, timeRange)
    }));

    return {
      apiMetrics,
      dbMetrics,
      memoryMetrics,
      cpuMetrics
    };
  }, [metrics, timeRange]);

  return (
    <div>
      <Card title="系统监控" style={{ marginBottom: 24 }}>
        <Space>
          <Text type="secondary">
            查看系统运行状态和性能指标
          </Text>
          <Button onClick={handleCleanup}>清理过期数据</Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={stats.count}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={stats.avgValue.toFixed(2)}
              suffix="ms"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="最大响应时间"
              value={stats.maxValue.toFixed(2)}
              suffix="ms"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="最小响应时间"
              value={stats.minValue.toFixed(2)}
              suffix="ms"
            />
          </Card>
        </Col>
      </Row>

      <Card title="时间范围" style={{ marginBottom: 24 }}>
        <Space>
          <Button 
            type={timeRange === '24h' ? 'primary' : 'default'}
            onClick={() => handleTimeRangeChange('24h')}
          >
            24小时
          </Button>
          <Button 
            type={timeRange === '7d' ? 'primary' : 'default'}
            onClick={() => handleTimeRangeChange('7d')}
          >
            7天
          </Button>
          <Button 
            type={timeRange === '30d' ? 'primary' : 'default'}
            onClick={() => handleTimeRangeChange('30d')}
          >
            30天
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={`API响应时间 (${chartData.apiMetrics.length} 个数据点)`} loading={loading}>
            {chartData.apiMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={chartData.apiMetrics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="metric_value" 
                    name="响应时间(ms)" 
                    stroke="#1890ff" 
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无API响应时间数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
        <Col span={24}>
          <Card title={`数据库性能 (${chartData.dbMetrics.length} 个数据点)`} loading={loading}>
            {chartData.dbMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={chartData.dbMetrics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="metric_value" 
                    name="执行时间(ms)" 
                    stroke="#52c41a" 
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无数据库性能数据（只记录超过100ms的慢查询）" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={`内存使用 (${chartData.memoryMetrics.length} 个数据点)`} loading={loading}>
            {chartData.memoryMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={chartData.memoryMetrics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="metric_value" 
                    name="内存使用(MB)" 
                    stroke="#faad14" 
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无内存使用数据（每30秒收集一次）" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={`CPU使用 (${chartData.cpuMetrics.length} 个数据点)`} loading={loading}>
            {chartData.cpuMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={chartData.cpuMetrics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="metric_value" 
                    name="CPU使用率(%)" 
                    stroke="#f5222d" 
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无CPU使用数据（每30秒收集一次）" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemMonitoringPage;