import React from 'react';
import { Breadcrumb } from 'antd';

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
  // 构建面包屑项数组
  const items = [];
  
  if (system) {
    items.push({ title: system });
  }
  
  if (module) {
    items.push({ title: module });
  }
  
  if (scenario) {
    items.push({ title: scenario });
  }

  // 如果没有选择任何参数，显示提示信息
  if (items.length === 0) {
    return (
      <div className={className} style={{ marginBottom: 16, color: '#666', fontSize: '14px' }}>
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