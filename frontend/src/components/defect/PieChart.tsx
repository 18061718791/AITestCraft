import React, { useState, useEffect } from 'react';
import { Spin, Alert, Select } from 'antd';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Pie } from 'react-chartjs-2';
import defectApi from '../../services/defect/defectApi';
import { DistributionData } from '../../types/defect';
import './PieChart.css';

interface PieChartProps {
  type: 'system' | 'priority';
  systemId?: number;
}

const { Option } = Select;

// 注册 Chart.js 组件
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title,
  ChartDataLabels
);

const PieChart: React.FC<PieChartProps> = ({ type, systemId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<DistributionData[]>([]);
  const [urgentOnly, setUrgentOnly] = useState(false);

  useEffect(() => {
    fetchDistributionData();
  }, [type, systemId, urgentOnly]);

  const fetchDistributionData = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (type === 'system') {
        if (systemId) {
          response = await defectApi.getSystemSystemDistribution(systemId, urgentOnly);
        } else {
          response = await defectApi.getOverviewSystemDistribution(urgentOnly);
        }
      } else {
        if (systemId) {
          response = await defectApi.getSystemPriorityDistribution(systemId);
        } else {
          response = await defectApi.getOverviewPriorityDistribution();
        }
      }

      if (response.success && response.data) {
        setChartData(response.data);
      } else {
        setError(response.error || '获取分布数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Error fetching distribution data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUrgentChange = (value: boolean) => {
    setUrgentOnly(value);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      datalabels: {
        display: true,
        color: '#fff',
        font: {
          weight: 'bold' as const,
          size: 14
        },
        formatter: function(value: any) {
          return value;
        }
      }
    },
  };

  const data = {
    labels: chartData.map(item => item.name),
    datasets: [
      {
        data: chartData.map(item => item.value),
        backgroundColor: chartData.map((item, index) => {
          if (type === 'system') {
            const colors = [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)',
              'rgba(201, 203, 207, 0.8)',
              'rgba(231, 233, 174, 0.8)',
              'rgba(166, 86, 40, 0.8)',
              'rgba(247, 129, 95, 0.8)',
              'rgba(139, 0, 0, 0.8)',
              'rgba(0, 100, 0, 0.8)',
              'rgba(70, 130, 180, 0.8)',
              'rgba(218, 165, 32, 0.8)',
              'rgba(128, 128, 0, 0.8)',
            ];
            return colors[index % colors.length];
          }
          const name = item.name || '';
          if (name.includes('紧急')) {
            return 'rgba(255, 99, 132, 0.8)';
          }
          if (name.includes('高')) {
            return 'rgba(255, 159, 64, 0.8)';
          }
          if (name.includes('中')) {
            return 'rgba(255, 206, 86, 0.8)';
          }
          if (name.includes('低')) {
            return 'rgba(75, 192, 192, 0.8)';
          }
          if (name.includes('未知')) {
            return 'rgba(201, 203, 207, 0.8)';
          }
          return 'rgba(54, 162, 235, 0.8)';
        }),
        borderColor: chartData.map((item, index) => {
          if (type === 'system') {
            const colors = [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
              'rgba(201, 203, 207, 1)',
              'rgba(231, 233, 174, 1)',
              'rgba(166, 86, 40, 1)',
              'rgba(247, 129, 95, 1)',
              'rgba(139, 0, 0, 1)',
              'rgba(0, 100, 0, 1)',
              'rgba(70, 130, 180, 1)',
              'rgba(218, 165, 32, 1)',
              'rgba(128, 128, 0, 1)',
            ];
            return colors[index % colors.length];
          }
          const name = item.name || '';
          if (name.includes('紧急')) {
            return 'rgba(255, 99, 132, 1)';
          }
          if (name.includes('高')) {
            return 'rgba(255, 159, 64, 1)';
          }
          if (name.includes('中')) {
            return 'rgba(255, 206, 86, 1)';
          }
          if (name.includes('低')) {
            return 'rgba(75, 192, 192, 1)';
          }
          if (name.includes('未知')) {
            return 'rgba(201, 203, 207, 1)';
          }
          return 'rgba(54, 162, 235, 1)';
        }),
        borderWidth: 1,
      },
    ],
  };

  // 获取颜色配置
  const getColors = () => {
    return chartData.map((item, index) => {
      if (type === 'system') {
        const colors = [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(201, 203, 207, 0.8)',
          'rgba(231, 233, 174, 0.8)',
          'rgba(166, 86, 40, 0.8)',
          'rgba(247, 129, 95, 0.8)',
          'rgba(139, 0, 0, 0.8)',
          'rgba(0, 100, 0, 0.8)',
          'rgba(70, 130, 180, 0.8)',
          'rgba(218, 165, 32, 0.8)',
          'rgba(128, 128, 0, 0.8)',
        ];
        return colors[index % colors.length];
      }
      const name = item.name || '';
      if (name.includes('紧急')) {
        return 'rgba(255, 99, 132, 0.8)';
      }
      if (name.includes('高')) {
        return 'rgba(255, 159, 64, 0.8)';
      }
      if (name.includes('中')) {
        return 'rgba(255, 206, 86, 0.8)';
      }
      if (name.includes('低')) {
        return 'rgba(75, 192, 192, 0.8)';
      }
      if (name.includes('未知')) {
        return 'rgba(201, 203, 207, 0.8)';
      }
      return 'rgba(54, 162, 235, 0.8)';
    });
  };

  const colors = getColors();

  return (
    <div className="pie-chart" style={{ height: 400, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h4>{type === 'system' ? '系统分布' : '优先级分布'}</h4>
        {type === 'system' && (
          <Select
            value={urgentOnly}
            onChange={handleUrgentChange}
            style={{ width: 150 }}
          >
            <Option value={false}>BUG ALL</Option>
            <Option value={true}>紧急 BUG</Option>
          </Select>
        )}
      </div>
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>加载分布数据...</div>
          <Spin />
        </div>
      ) : error ? (
        <Alert message="错误" description={error} type="error" showIcon />
      ) : (
        <>
          <div style={{ height: 220, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Pie options={options} data={data} />
          </div>
          {/* 自定义图例 */}
          <div className="pie-legend-container">
            <div className="pie-legend-colors">
              {chartData.map((_, index) => (
                <span
                  key={index}
                  className="pie-legend-color"
                  style={{ backgroundColor: colors[index] }}
                />
              ))}
            </div>
            <div className="pie-legend-labels">
              {chartData.map((item, index) => (
                <span key={index} className="pie-legend-label">{item.name}</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PieChart;