import React from 'react';
import { Segmented } from 'antd';
import { AppstoreOutlined, ProfileOutlined } from '@ant-design/icons';
import { useLayoutMode } from '../contexts/LayoutModeContext';

interface LayoutModeSwitchProps {
  className?: string;
}

export const LayoutModeSwitch: React.FC<LayoutModeSwitchProps> = ({ className }) => {
  const { layoutMode, setLayoutMode } = useLayoutMode();

  const handleModeChange = (value: string | number) => {
    const newMode = value as 'modern' | 'traditional';
    setLayoutMode(newMode);
    localStorage.setItem('layoutMode', newMode);
  };

  return (
    <Segmented
      className={className}
      value={layoutMode}
      onChange={handleModeChange}
      options={[
        {
          label: '现代模式',
          value: 'modern',
          icon: <AppstoreOutlined />,
        },
        {
          label: '传统模式',
          value: 'traditional',
          icon: <ProfileOutlined />,
        },
      ]}
    />
  );
};

export default LayoutModeSwitch;
