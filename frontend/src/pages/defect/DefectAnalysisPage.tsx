import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { BarChartOutlined, FolderOutlined, LineChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import TrendChart from '../../components/defect/TrendChart';
import PieChart from '../../components/defect/PieChart';
import DefectTree from '../../components/defect/DefectTree';
import { useTheme } from '../../contexts/ThemeContext';

const { Title } = Typography;

const DefectAnalysisPage: React.FC = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  
  // 从URL参数中获取systemId
  const urlParams = new URLSearchParams(window.location.search);
  const urlSystemId = urlParams.get('systemId');
  const initialSystemId = urlSystemId ? parseInt(urlSystemId) : 0;

  const [selectedNodeId, setSelectedNodeId] = useState<number>(isNaN(initialSystemId) ? 0 : initialSystemId);
  const [selectedNodeName, setSelectedNodeName] = useState<string>('全部项目'); // 默认选择

  // 组件加载时检查URL参数中的systemId
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSystemId = urlParams.get('systemId');
    if (urlSystemId) {
      const parsedSystemId = parseInt(urlSystemId);
      if (!isNaN(parsedSystemId)) {
        setSelectedNodeId(parsedSystemId);
      }
    }
  }, [location.search]);

  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
  };

  const handleNodeNameChange = (nodeName: string) => {
    setSelectedNodeName(nodeName);
  };

  // 根据选择的节点类型确定是否显示系统分布图
  const shouldShowSystemDistribution = selectedNodeId === 0;

  // 项目管理根节点不展示统计数据
  const isProjectManagementNode = selectedNodeId === 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      {/* 标题区域 */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <Title level={4} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          数据分析
        </Title>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #94a3b8)' }}>
          通过图表分析缺陷的趋势和分布情况，帮助您更好地了解项目质量状况。
        </p>
      </div>

      {/* 内容区域 - 左右分栏，各自独立滚动 */}
      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        {/* 左侧 - 缺陷目录结构 */}
        <Col xs={24} md={6} style={{ height: '100%' }}>
          <Card 
            style={{ 
              height: '100%', 
              background: 'var(--bg-container, #1e293b)', 
              borderColor: 'var(--border-color, #334155)',
              display: 'flex',
              flexDirection: 'column',
            }}
            bodyStyle={{ 
              height: '100%', 
              padding: '16px',
              overflow: 'auto',
            }}
          >
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary, #f1f5f9)', margin: 0, fontSize: 14 }}>
                <FolderOutlined style={{ marginRight: 8 }} />
                缺陷目录结构
              </h4>
            </div>
            <DefectTree
              onNodeSelect={handleNodeSelect}
              onNodeNameChange={handleNodeNameChange}
              selectedNodeId={selectedNodeId}
            />
          </Card>
        </Col>
        
        {/* 右侧 - 分析维度 */}
        <Col xs={24} md={18} style={{ height: '100%' }}>
          <Card 
            style={{ 
              height: '100%', 
              background: 'var(--bg-container, #1e293b)', 
              borderColor: 'var(--border-color, #334155)',
              display: 'flex',
              flexDirection: 'column',
            }}
            bodyStyle={{ 
              height: '100%', 
              padding: '16px',
              overflow: 'auto',
            }}
          >
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h4 style={{ color: 'var(--text-primary, #f1f5f9)', margin: 0, fontSize: 14 }}>分析维度</h4>
            </div>

            {isProjectManagementNode ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary, #64748b)' }}>
                <FolderOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>项目管理节点不展示统计数据</p>
                <p style={{ fontSize: 12 }}>请选择具体的项目或系统节点查看数据分析</p>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {/* 趋势分析模块 */}
                <Col xs={24}>
                  <Card
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LineChartOutlined style={{ color: '#00d4ff' }} />
                        <span>趋势分析</span>
                      </div>
                    }
                    style={{
                      background: isDark ? 'transparent' : '#ffffff',
                      border: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid #e5e7eb',
                      borderRadius: 12,
                      boxShadow: isDark 
                        ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                        : '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    headStyle={{
                      borderBottom: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid #e5e7eb',
                      color: isDark ? '#f1f5f9' : '#1f2937',
                    }}
                    bodyStyle={{ padding: 16 }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = isDark
                        ? '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 212, 255, 0.25), 0 0 60px rgba(0, 212, 255, 0.15)'
                        : '0 20px 40px rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.borderColor = isDark ? '#00d4ff' : '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isDark 
                        ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                        : '0 2px 8px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = isDark ? 'rgba(0, 212, 255, 0.3)' : '#e5e7eb';
                    }}
                  >
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: isDark ? 'transparent' : '#f8fafc', 
                      borderRadius: 8, 
                      width: '100%' 
                    }}>
                      <TrendChart systemId={selectedNodeId} selectedNodeName={selectedNodeName} />
                    </div>
                  </Card>
                </Col>

                {/* 系统分布模块 */}
                {shouldShowSystemDistribution && (
                  <Col xs={24} md={12}>
                    <Card
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <PieChartOutlined style={{ color: '#00d4ff' }} />
                          <span>系统分布</span>
                        </div>
                      }
                      style={{
                        background: isDark ? 'transparent' : '#ffffff',
                        border: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid #e5e7eb',
                        borderRadius: 12,
                        boxShadow: isDark 
                          ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                          : '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      headStyle={{
                        borderBottom: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid #e5e7eb',
                        color: isDark ? '#f1f5f9' : '#1f2937',
                      }}
                      bodyStyle={{ padding: 16 }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = isDark
                          ? '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 212, 255, 0.25), 0 0 60px rgba(0, 212, 255, 0.15)'
                          : '0 20px 40px rgba(0, 0, 0, 0.15)';
                        e.currentTarget.style.borderColor = isDark ? '#00d4ff' : '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isDark 
                          ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                          : '0 2px 8px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = isDark ? 'rgba(0, 212, 255, 0.3)' : '#e5e7eb';
                      }}
                    >
                      <div style={{ 
                        padding: 16, 
                        backgroundColor: isDark ? 'transparent' : '#f8fafc', 
                        borderRadius: 8, 
                        width: '100%' 
                      }}>
                        <PieChart type="system" systemId={selectedNodeId} />
                      </div>
                    </Card>
                  </Col>
                )}

                {/* 优先级分布模块 */}
                <Col xs={24} md={shouldShowSystemDistribution ? 12 : 24}>
                  <Card
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PieChartOutlined style={{ color: '#00d4ff' }} />
                        <span>优先级分析</span>
                      </div>
                    }
                    style={{
                      background: isDark ? 'transparent' : '#ffffff',
                      border: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid #e5e7eb',
                      borderRadius: 12,
                      boxShadow: isDark 
                        ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                        : '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    headStyle={{
                      borderBottom: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid #e5e7eb',
                      color: isDark ? '#f1f5f9' : '#1f2937',
                    }}
                    bodyStyle={{ padding: 16 }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = isDark
                        ? '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 212, 255, 0.25), 0 0 60px rgba(0, 212, 255, 0.15)'
                        : '0 20px 40px rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.borderColor = isDark ? '#00d4ff' : '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isDark 
                        ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                        : '0 2px 8px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = isDark ? 'rgba(0, 212, 255, 0.3)' : '#e5e7eb';
                    }}
                  >
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: isDark ? 'transparent' : '#f8fafc', 
                      borderRadius: 8, 
                      width: '100%' 
                    }}>
                      <PieChart type="priority" systemId={selectedNodeId} />
                    </div>
                  </Card>
                </Col>
              </Row>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DefectAnalysisPage;
