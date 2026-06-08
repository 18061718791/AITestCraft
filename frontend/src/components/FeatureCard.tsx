import React from 'react';
import { Card, Typography } from 'antd';
import {
  RocketOutlined,
  CheckSquareOutlined,
  BugOutlined,
  SettingOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Paragraph } = Typography;

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick: () => void;
}

// 图标映射
const iconMapping: Record<string, React.ReactNode> = {
  RocketOutlined: <RocketOutlined />,
  CheckSquareOutlined: <CheckSquareOutlined />,
  BugOutlined: <BugOutlined />,
  SettingOutlined: <SettingOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  color,
  onClick
}) => {
  const { isDark } = useTheme();

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        height: '100%',
        textAlign: 'center',
        borderTop: `4px solid ${color}`,
        background: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e5e7eb',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
      }}
      bodyStyle={{
        padding: '32px 24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = isDark
          ? `0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px ${color}40, 0 0 60px ${color}20`
          : '0 20px 40px rgba(0, 0, 0, 0.15)';
        e.currentTarget.style.borderColor = isDark ? color : '#e5e7eb';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isDark
          ? '0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 4px 12px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.borderColor = isDark ? '#334155' : '#e5e7eb';
      }}
    >
      <div
        style={{
          fontSize: 64,
          color: color,
          marginBottom: 24,
          transition: 'transform 0.3s ease',
        }}
        className="feature-icon"
      >
        {iconMapping[icon] || <RocketOutlined />}
      </div>
      <Title
        level={3}
        style={{
          marginBottom: 16,
          color: isDark ? '#f1f5f9' : '#1f2937',
          fontSize: 22,
        }}
      >
        {title}
      </Title>
      <Paragraph
        style={{
          color: isDark ? '#94a3b8' : '#6b7280',
          fontSize: 14,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {description}
      </Paragraph>
    </Card>
  );
};

export default FeatureCard;
