import React from 'react';
import { Layout, Row, Col, Typography } from 'antd';
import { BugOutlined } from '@ant-design/icons';
import DefectTree from '../../components/defect/DefectTree';
import TrendChart from '../../components/defect/TrendChart';
import PieChart from '../../components/defect/PieChart';

const { Content } = Layout;
const { Title } = Typography;

const DefectHomePage: React.FC = () => {

  return (
    <Content style={{ padding: '24px', minHeight: 280 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ display: 'flex', alignItems: 'center' }}>
          <BugOutlined style={{ marginRight: 8 }} />
          缺陷管理
        </Title>
        <p>欢迎使用缺陷管理系统，您可以通过左侧目录树浏览和筛选缺陷，右侧查看统计分析结果。</p>
      </div>

      <Row gutter={24}>
        {/* 左侧目录树 */}
        <Col span={6}>
          <DefectTree />
        </Col>

        {/* 右侧统计分析 */}
        <Col span={18}>
          <Row gutter={24}>
            <Col span={24}>
              <TrendChart />
            </Col>
            <Col span={12}>
              <PieChart type="system" />
            </Col>
            <Col span={12}>
              <PieChart type="priority" />
            </Col>
          </Row>
        </Col>
      </Row>
    </Content>
  );
};

export default DefectHomePage;