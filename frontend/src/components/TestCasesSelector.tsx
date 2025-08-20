import React, { useState } from 'react';
import { Card, Table, Button, Typography, Space, Spin, Alert } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useAppContext } from '../contexts/AppContext';
import { testApi } from '../services/api';

const { Title, Paragraph } = Typography;

interface TestCasesSelectorProps {
  onBack: () => void;
}

export const TestCasesSelector: React.FC<TestCasesSelectorProps> = ({ onBack }) => {
  const { state, dispatch } = useAppContext();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const columns = [
    {
      title: '编号',
      dataIndex: 'number',
      key: 'number',
      width: 100,
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '前置条件',
      dataIndex: 'precondition',
      key: 'precondition',
      ellipsis: true,
    },
    {
      title: '步骤',
      dataIndex: 'steps',
      key: 'steps',
      render: (steps: string[]) => (
        <ol style={{ margin: 0, paddingLeft: 16 }}>
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      ),
    },
    {
      title: '期望结果',
      dataIndex: 'expected_results',
      key: 'expected_results',
      ellipsis: true,
    },
  ];

  const handleDownload = async () => {
    const selectedCases = state.testCases.filter(
      (testCase) => selectedRowKeys.includes(testCase.number)
    );

    if (selectedCases.length === 0) {
      dispatch({ type: 'SET_ERROR', payload: '请至少选择一个测试用例' });
      return;
    }

    try {
      setIsDownloading(true);
      dispatch({ type: 'SET_ERROR', payload: undefined });
      dispatch({ type: 'SET_SELECTED_TEST_CASES', payload: selectedCases });

      const blob = await testApi.downloadExcel(selectedCases);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `测试用例_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      const message = error instanceof Error ? error.message : '下载失败';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectChange = (selectedKeys: React.Key[]) => {
    setSelectedRowKeys(selectedKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: handleSelectChange,
  };

  if (state.isLoading && state.testCases.length === 0) {
    return (
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <Spin size="large" />
          <Title level={3}>测试用例生成中...</Title>
          <Paragraph>正在根据选择的测试点生成测试用例，请稍候...</Paragraph>
        </Space>
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>步骤3：选择测试用例并下载</Title>
          <Paragraph type="secondary">
            请选择需要下载的测试用例，然后点击下载按钮。
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
          <Paragraph>
            已选择 {selectedRowKeys.length} 个测试用例，共 {state.testCases.length} 个
          </Paragraph>
        </div>

        <Table
          dataSource={state.testCases}
          columns={columns}
          rowKey="number"
          rowSelection={rowSelection}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={onBack} disabled={isDownloading}>
            返回上一步
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            loading={isDownloading}
            disabled={selectedRowKeys.length === 0}
          >
            {isDownloading ? '下载中...' : '下载用例'}
          </Button>
        </Space>
      </Space>
    </Card>
  );
};