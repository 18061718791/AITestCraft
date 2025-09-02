import React from 'react';
import { Typography, Steps, Row, Col } from 'antd';
import { RequirementInput } from '../components/RequirementInput';
import { TestPointsSelector } from '../components/TestPointsSelector';
import { TestCasesSelector } from '../components/TestCasesSelector';
import { useAppContext } from '../contexts/AppContext';

const { Title, Paragraph } = Typography;

const steps = [
  {
    title: '需求输入',
    description: '输入测试需求描述',
  },
  {
    title: '测试点选择',
    description: '选择关键场景',
  },
  {
    title: '用例生成',
    description: '生成完整测试用例',
  },
];

export const TestCaseAssistantPage: React.FC = () => {
  const { state } = useAppContext();

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <RequirementInput onNext={() => {}} />;
      case 2:
        return (
          <TestPointsSelector 
            onNext={() => {}} 
            onBack={() => {}} 
          />
        );
      case 3:
        return <TestCasesSelector onBack={() => {}} />;
      default:
        return <RequirementInput onNext={() => {}} />;
    }
  };

  return (
    <div className="main-content">
      <div className="fade-in">
        {/* 页面标题 */}
        <div className="content-section">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <Title level={1} style={{ marginBottom: 0, color: 'var(--primary-color)' }}>
              AI测试用例生成助手
            </Title>
            <Paragraph style={{ marginBottom: 0 }}>
              基于AI的智能测试用例生成工具，快速创建高质量的测试用例
            </Paragraph>
          </div>
        </div>

        {/* 步骤条 */}
        <div className="content-section">
          <div className="section-content">
            <Row justify="center">
              <Col xs={24} sm={20} md={16} lg={12}>
                <Steps
                  current={state.currentStep - 1}
                  items={steps}
                  responsive={true}
                />
              </Col>
            </Row>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="content-section">
          <div className="section-content">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
};