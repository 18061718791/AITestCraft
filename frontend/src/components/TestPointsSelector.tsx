import React, { useState } from 'react';
import { Card, Checkbox, Button, Typography, Space, List, Spin, Alert } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useAppContext } from '../contexts/AppContext';
import { useGenerateCases } from '../hooks/useGenerateCases';

const { Title, Paragraph, Text } = Typography;
const { Group } = Checkbox;

interface TestPointsSelectorProps {
  onNext: () => void;
  onBack: () => void;
}

export const TestPointsSelector: React.FC<TestPointsSelectorProps> = ({ onNext, onBack }) => {
  const { state, dispatch } = useAppContext();
  const { generateCases, isGenerating } = useGenerateCases();
  const [checkedList, setCheckedList] = useState<string[]>(state.selectedTestPoints);

  const handleGenerateCases = async () => {
    // 直接使用checkedList作为参数，避免依赖异步的state更新
    const selectedPoints = [...checkedList];
    dispatch({ type: 'SET_SELECTED_TEST_POINTS', payload: selectedPoints });
    
    // 使用新的参数化generateCases函数
    await generateCases(selectedPoints);
    onNext();
  };

  const handleCheckAll = (e: any) => {
    setCheckedList(e.target.checked ? state.testPoints : []);
  };

  const handleCheckChange = (checkedValues: string[]) => {
    setCheckedList(checkedValues);
  };

  if (state.isLoading && state.testPoints.length === 0) {
    return (
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <Spin size="large" />
          <Title level={3}>测试点生成中...</Title>
          <Paragraph>正在分析您的需求并生成测试点，请稍候...</Paragraph>
        </Space>
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>步骤2：选择测试点</Title>
          <Paragraph type="secondary">
            请选择需要生成测试用例的测试点。您可以全选或选择部分测试点。
          </Paragraph>
        </div>

        {state.error && (
          <Alert
            message="错误"
            description={state.error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch({ type: 'SET_ERROR', payload: undefined })}
          />
        )}

        <div>
          <Checkbox
            indeterminate={checkedList.length > 0 && checkedList.length < state.testPoints.length}
            checked={checkedList.length === state.testPoints.length && state.testPoints.length > 0}
            onChange={handleCheckAll}
            disabled={isGenerating}
          >
            全选 ({checkedList.length}/{state.testPoints.length})
          </Checkbox>
        </div>

        <Group
          value={checkedList}
          onChange={handleCheckChange}
          style={{ width: '100%' }}
        >
          <List
            dataSource={state.testPoints}
            renderItem={(point, index) => (
              <List.Item>
                <Checkbox value={point} disabled={isGenerating}>
                  <Text>
                    {index + 1}. {point}
                  </Text>
                </Checkbox>
              </List.Item>
            )}
          />
        </Group>

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={onBack} disabled={isGenerating}>
            返回上一步
          </Button>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={handleGenerateCases}
            loading={isGenerating}
            disabled={checkedList.length === 0}
          >
            {isGenerating ? '生成中...' : '生成测试用例'}
          </Button>
        </Space>
      </Space>
    </Card>
  );
};