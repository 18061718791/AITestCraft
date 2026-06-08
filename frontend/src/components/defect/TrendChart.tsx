import React, { useState, useEffect } from 'react';
import { Spin, Alert, Select } from 'antd';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Line } from 'react-chartjs-2';
import defectApi from '../../services/defect/defectApi';
import { TrendData } from '../../types/defect';

interface TrendChartProps {
  systemId?: number;
  selectedNodeName?: string;
}

const { Option } = Select;

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const TrendChart: React.FC<TrendChartProps> = ({ systemId, selectedNodeName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<TrendData | null>(null);
  const [trendType, setTrendType] = useState<'all' | 'urgent'>('all');

  useEffect(() => {
    fetchTrendData();
  }, [trendType, systemId]);

  const fetchTrendData = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (systemId) {
        response = await defectApi.getSystemTrend(systemId, trendType);
      } else {
        response = await defectApi.getOverviewTrend(trendType);
      }

      if (response.success && response.data) {
        setChartData(response.data);
      } else {
        setError(response.error || '获取趋势数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Error fetching trend data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrendTypeChange = (value: 'all' | 'urgent') => {
    setTrendType(value);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: selectedNodeName ? `${selectedNodeName} ${trendType === 'all' ? 'Bug ALLOpen & ALLClose 趋势' : '紧急 BUG 解决趋势'}` : 
              `${trendType === 'all' ? 'Bug ALLOpen & ALLClose 趋势' : '紧急 BUG 解决趋势'}`,
      },
      datalabels: {
          display: true,
          color: function(context: any) {
            return context.dataset.borderColor;
          },
          font: {
            weight: 'bold' as const,
            size: 12
          },
          offset: 15,
          align: 'center' as const,
          anchor: 'end' as const,
          formatter: function(value: any) {
            return value;
          }
        }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '数量',
        },
      },
      x: {
        title: {
          display: true,
          text: '周',
        },
      },
    },
  };

  const data = chartData ? {
    labels: chartData.labels,
    datasets: chartData.datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.data,
      borderColor: index === 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)',
      backgroundColor: index === 0 ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)',
      tension: 0.1,
    })),
  } : {
    labels: [],
    datasets: [],
  };

  return (
    <div className="trend-chart" style={{ height: 400, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4>趋势分析</h4>
        <Select
          value={trendType}
          onChange={handleTrendTypeChange}
          style={{ width: 150 }}
        >
          <Option value="all">ALL</Option>
          <Option value="urgent">紧急</Option>
        </Select>
      </div>
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>加载趋势数据...</div>
          <Spin />
        </div>
      ) : error ? (
        <Alert message="错误" description={error} type="error" showIcon />
      ) : (
        <div style={{ height: 300 }}>
          <Line options={options} data={data} />
        </div>
      )}
    </div>
  );
};

export default TrendChart;