import React, { useState } from 'react';
import { Card, Button, Space, Typography, Table, Tag, message, Checkbox } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SaveOutlined } from '@ant-design/icons';
import { useAppContext } from '../contexts/AppContext';
import { useExportCases } from '../hooks/useExportCases';
import { testCaseService } from '../services/testCaseService';
import { TestCase as OriginalTestCase } from '../types';
import BreadcrumbDisplay from './BreadcrumbDisplay';

const { Title, Text } = Typography;

interface TestCasesSelectorProps {
  onBack?: () => void;
}

export const TestCasesSelector: React.FC<TestCasesSelectorProps> = ({ onBack }) => {
  const { state, dispatch } = useAppContext();
  const { exportToExcel, loading } = useExportCases();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 处理测试用例选择
  const handleSelectChange = (selectedKeys: React.Key[]) => {
    setSelectedRowKeys(selectedKeys);
    
    // 更新测试用例的选择状态
    const updatedCases = state.testCases.map(testCase => ({
      ...testCase,
      selected: selectedKeys.includes(testCase.number)
    }));
    dispatch({ type: 'SET_TEST_CASES', payload: updatedCases });
  };

  // 处理全选/取消全选
  const handleSelectAll = (e: any) => {
    if (e.target.checked) {
      const allKeys = state.testCases.map(testCase => testCase.number);
      setSelectedRowKeys(allKeys);
      
      const updatedCases = state.testCases.map(testCase => ({
        ...testCase,
        selected: true
      }));
      dispatch({ type: 'SET_TEST_CASES', payload: updatedCases });
    } else {
      setSelectedRowKeys([]);
      
      const updatedCases = state.testCases.map(testCase => ({
        ...testCase,
        selected: false
      }));
      dispatch({ type: 'SET_TEST_CASES', payload: updatedCases });
    }
  };

  // 获取选中的测试用例
  const getSelectedTestCases = (): OriginalTestCase[] => {
    return state.testCases.filter(testCase => 
      selectedRowKeys.includes(testCase.number)
    );
  };

  const handleExport = async () => {
    const selectedCases = getSelectedTestCases();
    if (selectedCases.length === 0) {
      message.warning('请先选择要导出的测试用例');
      return;
    }

    try {
      await exportToExcel(selectedCases);
      message.success(`成功导出 ${selectedCases.length} 个测试用例！`);
    } catch (error) {
      message.error('导出失败，请重试');
    }
  };

  const handleSaveToTestCases = async () => {
    const selectedCases = getSelectedTestCases();
    if (selectedCases.length === 0) {
      message.warning('请先选择要保存的测试用例');
      return;
    }

    // 功能场景为可选项，不强制要求选择
    // 如果没有选择场景，使用默认场景或空字符串

    try {
      const testCasesToSave = selectedCases.map(tc => ({
        title: tc.title,
        preconditions: Array.isArray(tc.precondition) ? tc.precondition.join('\n') : tc.precondition || '',
        steps: Array.isArray(tc.steps) ? tc.steps.join('\n') : tc.steps || '',
        expectedResult: Array.isArray(tc.expected_results) ? tc.expected_results.join('\n') : tc.expected_results || '',
        priority: tc.priority === '高' ? 'HIGH' : tc.priority === '中' ? 'MEDIUM' : 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH',
        tags: [] as string[],
      }));

      const savedCases = await testCaseService.saveFromTestAssistant(
        state.selectedScenario?.id,
        state.selectedModule?.id,
        state.selectedSystem?.id,
        testCasesToSave
      );
      
      message.success(`成功保存 ${savedCases.length} 个测试用例到用例库！`);
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
    onBack?.();
  };

  const handleRestart = () => {
    dispatch({ type: 'RESET_STATE' });
    setSelectedRowKeys([]);
  };

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: handleSelectChange,
    columnWidth: 50,
    getCheckboxProps: (record: OriginalTestCase) => ({
      name: record.title,
    }),
  };

  // 表格列配置 - 移除系统、功能模块、功能场景字段
  const columns = [
    {
      title: '用例编号',
      dataIndex: 'number',
      key: 'number',
      width: 120,
    },
    {
      title: '用例标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
    },
    {
      title: '前置条件',
      dataIndex: 'precondition',
      key: 'precondition',
      width: 150,
      ellipsis: true,
    },
    {
      title: '测试步骤',
      dataIndex: 'steps',
      key: 'steps',
      width: 250,
      render: (steps: string[]) => (
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      ),
    },
    {
      title: '预期结果',
      dataIndex: 'expected_results',
      key: 'expected_results',
      width: 250,
      ellipsis: true,
      render: (expected: string | string[]) => 
        Array.isArray(expected) ? expected.join(', ') : expected,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority?: string) => {
        if (!priority) return <Tag>未设置</Tag>;
        const color = priority === '高' ? 'red' : priority === '中' ? 'orange' : 'green';
        return <Tag color={color}>{priority}</Tag>;
      },
    },
  ];

  const selectedCount = selectedRowKeys.length;

  return (
    <Card title="步骤3：查看测试用例" style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 面包屑显示用户选择的系统-模块-场景信息 */}
        <BreadcrumbDisplay 
          system={state.selectedSystem?.name}
          module={state.selectedModule?.name}
          scenario={state.selectedScenario?.name}
        />
        
        <div>
          <Title level={4}>生成的测试用例 ({state.testCases.length}个)</Title>
          {selectedCount > 0 && (
            <Text type="secondary">
              已选择 {selectedCount} 个测试用例
            </Text>
          )}
        </div>

        <Space style={{ marginBottom: 16 }}>
          <Checkbox
            checked={selectedCount === state.testCases.length && state.testCases.length > 0}
            indeterminate={selectedCount > 0 && selectedCount < state.testCases.length}
            onChange={handleSelectAll}
          >
            全选/取消全选
          </Checkbox>
        </Space>

        <Table
          columns={columns}
          dataSource={state.testCases}
          rowKey="number"
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1000 }}
        />

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            >
              返回
            </Button>
            <Button onClick={handleRestart}>
              重新开始
            </Button>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveToTestCases}
              disabled={selectedCount === 0}
            >
              保存用例 ({selectedCount})
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={loading}
              onClick={handleExport}
              disabled={selectedCount === 0}
            >
              导出选中 ({selectedCount})
            </Button>
          </Space>
        </Space>
      </Space>
    </Card>
  );
};