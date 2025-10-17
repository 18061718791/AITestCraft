import React from 'react';
import { Card, Typography, Space, Button, Row, Col } from 'antd';
import { 
  PlayCircleOutlined, 
  ApiOutlined, 
  FileTextOutlined, 
  SettingOutlined,
  RocketOutlined,
  BulbOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="main-content">
      <div className="fade-in">
        {/* 英雄区域 */}
        <div className="content-section">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <Title level={1} style={{ marginBottom: 0, color: 'var(--primary-color)' }}>
              欢迎使用AI测试平台
            </Title>
            <Paragraph style={{ fontSize: 18, marginBottom: 0 }}>
              基于人工智能的测试用例生成平台，让测试工作更高效、更智能
            </Paragraph>
          </div>
          
          <div className="section-content">
            <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
              <div>
                <ApiOutlined style={{ fontSize: 64, color: 'var(--primary-color)', marginBottom: 24 }} />
                <Title level={2} style={{ marginBottom: 16 }}>
                  AI测试用例生成助手
                </Title>
                <Paragraph style={{ fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
                  输入需求描述，AI将自动分析并生成完整的测试用例，包括测试点提取、
                  测试用例设计、Excel导出等功能。
                </Paragraph>
              </div>
              
              <Button 
                type="primary" 
                size="large" 
                icon={<PlayCircleOutlined />}
                onClick={() => navigate('/assistant')}
                style={{ width: 200, height: 48, fontSize: 16 }}
              >
                立即开始
              </Button>
            </Space>
          </div>
        </div>

        {/* 功能特色 */}
        <div className="content-section">
          <div className="section-header">
            <Title level={2} style={{ marginBottom: 0 }}>
              功能特色
            </Title>
          </div>
          
          <div className="section-content">
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <RocketOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                  <Title level={4}>AI智能分析</Title>
                  <Paragraph type="secondary">
                    基于DeepSeek大模型，深度理解需求
                  </Paragraph>
                </div>
              </Col>
              
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <BulbOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                  <Title level={4}>测试点提取</Title>
                  <Paragraph type="secondary">
                    自动识别关键测试场景
                  </Paragraph>
                </div>
              </Col>
              
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <ApiOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
                  <Title level={4}>用例生成</Title>
                  <Paragraph type="secondary">
                    生成结构化的测试用例
                  </Paragraph>
                </div>
              </Col>
              
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <DownloadOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 16 }} />
                  <Title level={4}>Excel导出</Title>
                  <Paragraph type="secondary">
                    支持标准格式导出
                  </Paragraph>
                </div>
              </Col>
            </Row>
          </div>
        </div>

        {/* 管理工具 */}
        <div className="content-section">
          <div className="section-header">
            <Title level={2} style={{ marginBottom: 0 }}>
              管理工具
            </Title>
          </div>
          
          <div className="section-content">
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12}>
                <Card 
                  hoverable 
                  className="slide-in"
                  style={{ textAlign: 'center', height: '100%' }}
                  onClick={() => navigate('/prompts')}
                >
                  <FileTextOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 24 }} />
                  <Title level={3} style={{ marginBottom: 16 }}>
                    提示词管理
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                    管理和自定义AI提示词模板，优化测试用例生成效果
                  </Paragraph>
                  <Button type="primary" ghost>
                    进入管理
                  </Button>
                </Card>
              </Col>
              
              <Col xs={24} sm={12}>
                <Card 
                  hoverable 
                  className="slide-in"
                  style={{ textAlign: 'center', height: '100%' }}
                  onClick={() => navigate('/system')}
                >
                  <SettingOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 24 }} />
                  <Title level={3} style={{ marginBottom: 16 }}>
                    项目管理
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                    管理项目结构、测试场景和配置，构建完整的测试知识体系
                  </Paragraph>
                  <Button type="primary" ghost>
                    进入管理
                  </Button>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;