import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { promptApi, PromptFileInfo } from '../services/promptApi';

const { Title } = Typography;

const PromptManagementPage: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const data = await promptApi.getAllPrompts();
      setPrompts(data);
    } catch (error) {
      message.error('获取提示词列表失败');
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '文件',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: PromptFileInfo) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/prompts/${record.filename}`)}
          >
            查看详情
          </Button>
          <Button
            type="default"
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/prompts/${record.filename}/edit`)}
          >
            修改
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={2} style={{ margin: 0 }}>
            提示词管理
          </Title>
          <p style={{ color: '#666', marginTop: 8 }}>
            管理系统中的提示词文件，支持查看和编辑功能
          </p>
        </div>

        <Table
          columns={columns}
          dataSource={prompts}
          rowKey="filename"
          loading={loading}
          pagination={false}
          bordered
        />
      </Card>
    </div>
  );
};

export default PromptManagementPage;