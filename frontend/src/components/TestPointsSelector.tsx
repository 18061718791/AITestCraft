import React from 'react';
import { Card, Checkbox, Button, Space, Typography, List, Alert, Input } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, PlusOutlined } from '@ant-design/icons';
import { useGenerateCases } from '../hooks/useGenerateCases';
import { useAppContext } from '../contexts/AppContext';
import BreadcrumbDisplay from './BreadcrumbDisplay';
import { TestPoint } from '../types';

const { Title } = Typography;

interface TestPointsSelectorProps {
  onNext?: () => void;
  onBack?: () => void;
}

export const TestPointsSelector: React.FC<TestPointsSelectorProps> = ({ onNext, onBack }) => {
  const { state, dispatch } = useAppContext();
  const { generateCases, loading } = useGenerateCases();

  const handleGenerate = async () => {
    const selectedPoints = state.testPoints.filter(point => point.selected);
    if (selectedPoints.length === 0) {
      dispatch({ type: 'SET_ERROR', payload: '请至少选择一个测试点' });
      return;
    }

    dispatch({ type: 'SET_ERROR', payload: null });
    const selectedPointContents = selectedPoints.map(point => point.content);
    
    // 更新选择的测试点内容
    dispatch({ type: 'SET_SELECTED_TEST_POINTS', payload: selectedPointContents });
    
    await generateCases(selectedPointContents);
    
    // generateCases会自动处理后续步骤，不需要手动设置
    onNext?.();
  };

  const handleTogglePoint = (index: number) => {
    const updatedPoints = [...state.testPoints];
    updatedPoints[index] = {
      ...updatedPoints[index],
      selected: !updatedPoints[index].selected
    };
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  const handleToggleAll = () => {
    const allSelected = state.testPoints.every(point => point.selected);
    const updatedPoints = state.testPoints.map(point => ({
      ...point,
      selected: !allSelected
    }));
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  const handleAddCustomPoint = () => {
    const newPoint: TestPoint = {
      id: `custom-${Date.now()}`,
      content: '',
      selected: true,
      isCustom: true,
      isEditing: true
    };
    dispatch({ type: 'ADD_CUSTOM_TEST_POINT', payload: newPoint });
  };

  const handleEditPoint = (index: number, content: string) => {
    dispatch({ type: 'UPDATE_TEST_POINT', payload: { index, content } });
  };

  const handleStartEdit = (index: number) => {
    const updatedPoints = [...state.testPoints];
    updatedPoints[index] = {
      ...updatedPoints[index],
      isEditing: true
    };
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  // 移除未使用的handleCancelEdit函数
  // const handleCancelEdit = (index: number) => {
  //   const updatedPoints = [...state.testPoints];
  //   updatedPoints[index] = {
  //     ...updatedPoints[index],
  //     isEditing: false
  //   };
  //   dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  // };

  const shouldShowBreadcrumb = state.selectedSystem && 
                             state.selectedModule;

  return (
    <Card title="步骤2：选择测试点" style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {shouldShowBreadcrumb && (
          <BreadcrumbDisplay 
            system={state.selectedSystem?.name}
            module={state.selectedModule?.name}
            scenario={state.selectedScenario?.name}
          />
        )}
        <div>
          <Title level={4}>请选择要生成测试用例的测试点</Title>
        </div>

        {state.error && (
          <Alert
            message="错误"
            description={state.error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch({ type: 'SET_ERROR', payload: null })}
          />
        )}

        <Checkbox
          checked={state.testPoints.length > 0 && state.testPoints.every(point => point.selected)}
          indeterminate={
            state.testPoints.some(point => point.selected) &&
            !state.testPoints.every(point => point.selected)
          }
          onChange={handleToggleAll}
        >
          全选/取消全选
        </Checkbox>

        <List
          dataSource={state.testPoints}
          renderItem={(point, index) => (
            <List.Item>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Checkbox
                  checked={point.selected}
                  onChange={() => handleTogglePoint(index)}
                  style={{ marginRight: 8 }}
                />
                <span style={{ marginRight: 8, color: '#666', fontSize: '14px', minWidth: 30 }}>
                  {index + 1}.
                </span>
                {point.isEditing ? (
                  <Input
                    defaultValue={point.content}
                    autoFocus
                    onPressEnter={(e) => handleEditPoint(index, e.currentTarget.value)}
                    onBlur={(e) => handleEditPoint(index, e.currentTarget.value)}
                    style={{ flex: 1 }}
                    placeholder="请输入自定义测试点"
                  />
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>{point.content}</span>
                    {point.isCustom && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleStartEdit(index)}
                        style={{ marginLeft: 8 }}
                      >
                        编辑
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddCustomPoint}
          style={{ width: '100%' }}
        >
          添加测试点
        </Button>
        
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              dispatch({ type: 'SET_CURRENT_STEP', payload: 1 });
              onBack?.();
            }}
          >
            返回
          </Button>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={!state.testPoints.some(point => point.selected)}
          >
            生成测试用例
          </Button>
        </Space>
      </Space>
    </Card>
  );
};