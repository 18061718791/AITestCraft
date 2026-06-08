import React from 'react';
import { Breadcrumb } from 'antd';
import { useTheme } from '../contexts/ThemeContext';

interface BreadcrumbDisplayProps {
  system?: string;
  module?: string;
  scenario?: string;
  separator?: string;
  className?: string;
}

export const BreadcrumbDisplay: React.FC<BreadcrumbDisplayProps> = ({
  system,
  module,
  scenario,
  separator = ' > ',
  className = 'breadcrumb-container'
}) => {
  const { isDark } = useTheme();
  const items = [];

  if (system) items.push({ title: system });
  if (module) items.push({ title: module });
  if (scenario) items.push({ title: scenario });

  if (items.length === 0) {
    return (
      <div className={className} style={{ marginBottom: 16, color: isDark ? '#64748b' : '#666', fontSize: 14 }}>
        请先在步骤1选择系统、功能模块和功能场景
      </div>
    );
  }

  return (
    <div className={className} style={{ marginBottom: 16 }}>
      <Breadcrumb separator={separator} items={items} />
    </div>
  );
};

export default BreadcrumbDisplay;
