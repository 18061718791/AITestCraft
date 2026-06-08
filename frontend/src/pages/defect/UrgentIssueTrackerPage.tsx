import React from 'react';
import { Layout, Card } from 'antd';
import UrgentIssueTable from '../../components/defect/UrgentIssueTable';

const { Content } = Layout;

const UrgentIssueTrackerPage: React.FC = () => {
  return (
    <Content style={{ padding: '24px', minHeight: 280 }}>
      <Card style={{ marginBottom: 24, background: 'var(--bg-container, #1e293b)', borderColor: 'var(--border-color, #334155)' }}>
        <UrgentIssueTable />
      </Card>
    </Content>
  );
};

export default UrgentIssueTrackerPage;
