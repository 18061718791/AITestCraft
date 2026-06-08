import React from 'react';
import { Layout, Card } from 'antd';
import DefectTable from '../../components/defect/DefectTable';

const { Content } = Layout;

const DefectListPage: React.FC = () => {

  return (
    <Content style={{ padding: '24px', minHeight: 280 }}>
      <Card style={{ marginBottom: 24, background: 'var(--bg-container, #1e293b)', borderColor: 'var(--border-color, #334155)' }}>
        <DefectTable />
      </Card>
    </Content>
  );
};

export default DefectListPage;