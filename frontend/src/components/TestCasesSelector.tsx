import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Typography, Table, Tag, message, Checkbox, Tooltip, Modal, Descriptions } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
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
  const { isDark } = useTheme();
  const { exportToExcel, loading } = useExportCases();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<OriginalTestCase | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableScrollY, setTableScrollY] = useState<number | undefined>(400);

  useEffect(() => {
    const updateHeight = () => {
      if (tableContainerRef.current) {
        const parentHeight = tableContainerRef.current.parentElement?.clientHeight || window.innerHeight;
        const reservedHeight = 280;
        const newHeight = Math.max(300, parentHeight - reservedHeight);
        setTableScrollY(newHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    const observer = new ResizeObserver(updateHeight);
    if (tableContainerRef.current?.parentElement) {
      observer.observe(tableContainerRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, []);

  const primaryColor = isDark ? '#00d4ff' : '#3b82f6';

  const handleSelectChange = (selectedKeys: React.Key[]) => {
    setSelectedRowKeys(selectedKeys);
    const updatedCases = state.testCases.map(testCase => ({
      ...testCase,
      selected: selectedKeys.includes(testCase.number)
    }));
    dispatch({ type: 'SET_TEST_CASES', payload: updatedCases });
  };

  const handleSelectAll = (e: any) => {
    if (e.target.checked) {
      const allKeys = state.testCases.map(testCase => testCase.number);
      setSelectedRowKeys(allKeys);
      const updatedCases = state.testCases.map(testCase => ({ ...testCase, selected: true }));
      dispatch({ type: 'SET_TEST_CASES', payload: updatedCases });
    } else {
      setSelectedRowKeys([]);
      const updatedCases = state.testCases.map(testCase => ({ ...testCase, selected: false }));
      dispatch({ type: 'SET_TEST_CASES', payload: updatedCases });
    }
  };

  const getSelectedTestCases = (): OriginalTestCase[] => {
    return state.testCases.filter(testCase => selectedRowKeys.includes(testCase.number));
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

  const handleViewDetail = (testCase: OriginalTestCase) => {
    setSelectedTestCase(testCase);
    setDetailModalVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedTestCase(null);
  };

  const renderTooltipContent = (items: string[], title: string) => (
    <div style={{ maxWidth: 400, maxHeight: 300, overflow: 'auto' }}>
      <div style={{ fontWeight: 'bold', marginBottom: 8, color: isDark ? '#e2e8f0' : '#1e293b' }}>{title}</div>
      <ol style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((item, index) => (
          <li key={index} style={{ marginBottom: 4, color: isDark ? '#cbd5e1' : '#475569' }}>{item}</li>
        ))}
      </ol>
    </div>
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: handleSelectChange,
    columnWidth: 50,
    getCheckboxProps: (record: OriginalTestCase) => ({
      name: record.title,
    }),
  };

  const columns = [
    {
      title: '用例编号',
      dataIndex: 'number',
      key: 'number',
      width: 100,
    },
    {
      title: '用例标题',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      ellipsis: true,
      render: (title: string, record: OriginalTestCase) => (
        <Tooltip title="点击查看详情">
          <Button
            type="link"
            size="small"
            style={{
              padding: 0,
              textAlign: 'left' as const,
              whiteSpace: 'normal' as const,
              lineHeight: 1.5,
              color: primaryColor,
            }}
            onClick={() => handleViewDetail(record)}
          >
            <EyeOutlined style={{ marginRight: 4 }} />
            {title}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: '前置条件',
      dataIndex: 'precondition',
      key: 'precondition',
      width: 120,
      ellipsis: true,
      render: (text: string | undefined) => text || '-',
    },
    {
      title: '测试步骤',
      dataIndex: 'steps',
      key: 'steps',
      width: 220,
      render: (steps: string[] | string | undefined) => {
        const stepsArray = Array.isArray(steps) ? steps : steps ? [steps] : [];
        const displaySteps = stepsArray.slice(0, 3).map((step) =>
          step.length > 30 ? step.substring(0, 30) + '...' : step
        );
        const content = (
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }}>
            {displaySteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
            {stepsArray.length > 3 && <li>...</li>}
          </ol>
        );
        return (
          <Tooltip title={renderTooltipContent(stepsArray, '测试步骤')} placement="topLeft" overlayStyle={{ maxWidth: 450 }}>
            {content}
          </Tooltip>
        );
      },
    },
    {
      title: '预期结果',
      dataIndex: 'expected_results',
      key: 'expected_results',
      width: 220,
      render: (expected: string | string[] | undefined) => {
        const expectedArray = Array.isArray(expected) ? expected : expected ? [expected] : [];
        const displayExpected = expectedArray.slice(0, 3).map((item) =>
          item.length > 30 ? item.substring(0, 30) + '...' : item
        );
        const content = (
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }}>
            {displayExpected.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
            {expectedArray.length > 3 && <li>...</li>}
          </ol>
        );
        return (
          <Tooltip title={renderTooltipContent(expectedArray, '预期结果')} placement="topLeft" overlayStyle={{ maxWidth: 450 }}>
            {content}
          </Tooltip>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority?: string) => {
        if (!priority) return <Tag>未设置</Tag>;
        const color = priority === '高' ? 'red' : priority === '中' ? 'orange' : 'green';
        return <Tag color={color}>{priority}</Tag>;
      },
    },
  ];

  const selectedCount = selectedRowKeys.length;

  return (
    <Card
      title={
        <span style={{ color: isDark ? '#f1f5f9' : 'inherit' }}>
          步骤 3：查看测试用例
        </span>
      }
      style={{
        width: '100%',
        height: '100%',
        background: isDark ? 'transparent' : undefined,
        border: 'none',
        boxShadow: 'none',
      }}
      bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto', padding: '16px 12px' }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <BreadcrumbDisplay
          system={state.selectedSystem?.name}
          module={state.selectedModule?.name}
          scenario={state.selectedScenario?.name}
        />

        <div>
          <Title level={5} style={{ marginBottom: 4, fontSize: 15, color: isDark ? '#e2e8f0' : '#1e293b' }}>
            生成的测试用例 ({state.testCases.length}个)
          </Title>
          {selectedCount > 0 && (
            <Text style={{ fontSize: 12, color: isDark ? '#64748b' : '#94a3b8' }}>
              已选择 {selectedCount} 个测试用例
            </Text>
          )}
        </div>

        <Space style={{ marginBottom: 8 }}>
          <Checkbox
            checked={selectedCount === state.testCases.length && state.testCases.length > 0}
            indeterminate={selectedCount > 0 && selectedCount < state.testCases.length}
            onChange={handleSelectAll}
          >
            <span style={{ color: isDark ? '#e2e8f0' : undefined }}>全选/取消全选</span>
          </Checkbox>
        </Space>

        <div ref={tableContainerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={state.testCases}
            rowKey="number"
            rowSelection={rowSelection}
            pagination={{
              pageSize: 5,
              showTotal: (total) => `共 ${total} 条`,
              size: 'small',
            }}
            scroll={{ x: 940, y: tableScrollY }}
            size="small"
          />
        </div>

        <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} size="small">返回</Button>
            <Button onClick={handleRestart} size="small">重新开始</Button>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveToTestCases}
              disabled={selectedCount === 0}
              size="small"
              style={{ boxShadow: isDark ? `0 0 12px ${primaryColor}30` : undefined }}
            >
              保存用例 ({selectedCount})
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={loading}
              onClick={handleExport}
              disabled={selectedCount === 0}
              size="small"
              style={{ boxShadow: isDark ? `0 0 12px ${primaryColor}30` : undefined }}
            >
              导出选中 ({selectedCount})
            </Button>
          </Space>
        </Space>
      </Space>

      {/* 用例详情弹窗 */}
      <Modal
        title={`用例详情 - ${selectedTestCase?.number}`}
        open={detailModalVisible}
        onCancel={handleCloseDetail}
        footer={[
          <Button key="close" onClick={handleCloseDetail}>关闭</Button>,
        ]}
        width={800}
      >
        {selectedTestCase && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="用例编号">{selectedTestCase.number}</Descriptions.Item>
            <Descriptions.Item label="用例标题">{selectedTestCase.title}</Descriptions.Item>
            <Descriptions.Item label="系统">{selectedTestCase.system}</Descriptions.Item>
            <Descriptions.Item label="功能模块">{selectedTestCase.module}</Descriptions.Item>
            <Descriptions.Item label="功能场景">{selectedTestCase.scenario}</Descriptions.Item>
            <Descriptions.Item label="用例描述">{selectedTestCase.description}</Descriptions.Item>
            <Descriptions.Item label="前置条件">{selectedTestCase.precondition}</Descriptions.Item>
            <Descriptions.Item label="测试步骤">
              <ol style={{ margin: 0, paddingLeft: 20, color: 'inherit' }}>
                {Array.isArray(selectedTestCase.steps) ? (
                  selectedTestCase.steps.map((step, index) => <li key={index}>{step}</li>)
                ) : (
                  <li>{selectedTestCase.steps}</li>
                )}
              </ol>
            </Descriptions.Item>
            <Descriptions.Item label="预期结果">
              <ol style={{ margin: 0, paddingLeft: 20, color: 'inherit' }}>
                {Array.isArray(selectedTestCase.expected_results) ? (
                  selectedTestCase.expected_results.map((result, index) => <li key={index}>{result}</li>)
                ) : (
                  <li>{selectedTestCase.expected_results}</li>
                )}
              </ol>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{selectedTestCase.priority || '未设置'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};
