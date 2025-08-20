import React from 'react';
import { Layout, Typography, Space } from 'antd';
import { RequirementInput } from '../components/RequirementInput';
import { TestPointsSelector } from '../components/TestPointsSelector';
import { TestCasesSelector } from '../components/TestCasesSelector';
import { useAppContext } from '../contexts/AppContext';

const { Content } = Layout;
const { Title } = Typography;

const HomePage: React.FC = () => {
  const { state, dispatch } = useAppContext();

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <RequirementInput onNext={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 2 })} />;
      case 2:
        return (
          <TestPointsSelector 
            onNext={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 3 })} 
            onBack={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 1 })} 
          />
        );
      case 3:
        return <TestCasesSelector onBack={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 2 })} />;
      default:
        return <RequirementInput onNext={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 2 })} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={1}>AI 测试用例生成器</Title>
              <Title level={4} type="secondary">
                基于 AI 的智能测试用例生成工具
              </Title>
            </div>
            {renderStep()}
          </Space>
        </div>
      </Content>
    </Layout>
  );
};

export default HomePage;