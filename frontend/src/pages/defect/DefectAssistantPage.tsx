import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Spin, Table, Empty, Tag, Typography, Space, message as antdMessage, Avatar } from 'antd';
import { SendOutlined, ReloadOutlined, DownloadOutlined, PlusOutlined, UserOutlined, RobotOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import defectAssistantApi, { QueryResponse } from '../../services/defectAssistant/defectAssistantApi';
import './DefectAssistantPage.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  Filler,
  ChartDataLabels
);

const { TextArea } = Input;
const { Text, Title: AntTitle } = Typography;

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  resultType?: 'list' | 'chart' | 'count' | 'document' | 'guide';
  data?: QueryResponse['data'];
  loading?: boolean;
  query?: string;
  exportParams?: ExportParams;
}

interface ExportParams {
  projectId?: number;
  systemId?: number;
  moduleId?: number;
  statusName?: string;
  priorityName?: string;
  timeRange?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = 'defect_assistant_sessions';
const MAX_SESSIONS = 10;

const DefectAssistantPage: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    '查看物联应用已解决的问题',
    '物联平台问题趋势分析',
    '问题分布分析',
    '生成问题分析报告',
    '查看智能物联项目已关闭问题的数量',
    '查看物联应用新建状态的问题数量'
  ]);
  const [isFlipping, setIsFlipping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSessions = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSessions = JSON.parse(stored) as ChatSession[];
        parsedSessions.forEach(session => {
          session.createdAt = new Date(session.createdAt);
          session.updatedAt = new Date(session.updatedAt);
          session.messages.forEach(msg => {
            msg.timestamp = new Date(msg.timestamp);
          });
        });
        setSessions(parsedSessions);
        
        if (parsedSessions.length > 0) {
          const latestSession = parsedSessions.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          setCurrentSessionId(latestSession.id);
          setMessages(latestSession.messages);
        } else {
          createNewSession();
        }
      } else {
        createNewSession();
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      createNewSession();
    }
  };

  const saveSessions = (newSessions: ChatSession[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: '新会话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const welcomeMessage: ChatMessage = {
      id: `welcome-${Date.now()}`,
      type: 'assistant',
      content: '您好！我是您的缺陷小助手，可以帮您查询问题列表、分析问题趋势和分布情况。请问有什么可以帮您的？',
      timestamp: new Date()
    };
    
    newSession.messages = [welcomeMessage];
    
    let newSessions = [newSession, ...sessions];
    if (newSessions.length > MAX_SESSIONS) {
      newSessions = newSessions.slice(0, MAX_SESSIONS);
    }
    
    saveSessions(newSessions);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
  };

  const selectSession = (sessionId: string) => {
    if (sessionId === currentSessionId) return;

    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      // 触发翻转动画
      setIsFlipping(true);

      // 延迟切换会话内容，让动画先开始
      setTimeout(() => {
        setCurrentSessionId(sessionId);
        setMessages(session.messages);

        // 动画结束
        setTimeout(() => {
          setIsFlipping(false);
        }, 400);
      }, 200);
    }
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== sessionId);

    if (newSessions.length === 0) {
      createNewSession();
    } else {
      saveSessions(newSessions);
      if (currentSessionId === sessionId) {
        const latestSession = newSessions.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        setCurrentSessionId(latestSession.id);
        setMessages(latestSession.messages);
      }
    }
  };

  const clearAllSessions = () => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (currentSession) {
      const newSession: ChatSession = {
        ...currentSession,
        id: `session-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newSession]));
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
    antdMessage.success('已清空会话历史记录');
  };

  const updateCurrentSession = (newMessages: ChatMessage[], query?: string) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === currentSessionId) {
        const title = session.title === '新会话' && query 
          ? query.slice(0, 20) + (query.length > 20 ? '...' : '')
          : session.title;
        return {
          ...session,
          title,
          messages: newMessages,
          updatedAt: new Date()
        };
      }
      return session;
    });
    saveSessions(updatedSessions);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      query: inputValue.trim()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setLoading(true);

    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      type: 'assistant',
      content: '正在查询中...',
      timestamp: new Date(),
      loading: true
    };
    setMessages([...newMessages, loadingMessage]);

    try {
      const response = await defectAssistantApi.query({ query: userMessage.content });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.message,
        timestamp: new Date(),
        resultType: response.resultType,
        data: response.data,
        query: userMessage.content,
        exportParams: response.intent?.entities as ExportParams
      };

      const finalMessages = newMessages.filter(m => !m.loading).concat(assistantMessage);
      setMessages(finalMessages);
      updateCurrentSession(finalMessages, userMessage.content);

      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: '抱歉，查询过程中出现错误，请稍后重试。',
        timestamp: new Date()
      };
      const finalMessages = newMessages.filter(m => !m.loading).concat(errorMessage);
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    createNewSession();
  };

  const handleExport = async (message: ChatMessage) => {
    if (!message.exportParams) {
      antdMessage.warning('无法导出：缺少查询参数');
      return;
    }

    setExporting(true);
    try {
      await defectAssistantApi.exportData(message.query || '');
      antdMessage.success('导出成功');
    } catch (error) {
      antdMessage.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const renderResult = (message: ChatMessage) => {
    if (!message.data) return null;

    switch (message.resultType) {
      case 'list':
        return renderListResult(message.data, message);
      case 'chart':
        return renderChartResult(message.data);
      case 'count':
        return renderCountResult(message.data);
      case 'document':
        return renderDocumentResult(message.data);
      case 'guide':
      default:
        return null;
    }
  };

  const renderListResult = (data: QueryResponse['data'], message: ChatMessage) => {
    if (!data?.list || data.list.length === 0) {
      return <Empty description="暂无数据" />;
    }

    const columns = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
      { title: '主题', dataIndex: 'subject', key: 'subject', ellipsis: true },
      { 
        title: '状态', 
        dataIndex: 'status_name', 
        key: 'status_name',
        width: 100,
        render: (text: string) => {
          const color = text === '已解决' ? 'green' : text === '新建' ? 'blue' : 'orange';
          return <Tag color={color}>{text}</Tag>;
        }
      },
      { 
        title: '优先级', 
        dataIndex: 'priority_name', 
        key: 'priority_name',
        width: 80,
        render: (text: string) => {
          const color = text === '紧急' ? 'red' : 'default';
          return <Tag color={color}>{text}</Tag>;
        }
      },
      { title: '系统/模块', dataIndex: 'system_module_name', key: 'system_module_name', width: 150, ellipsis: true },
      { title: '分配给', dataIndex: 'assigned_to_name', key: 'assigned_to_name', width: 100, ellipsis: true },
      { title: '创建时间', dataIndex: 'created_on', key: 'created_on', width: 180, render: (text: string) => formatDateTime(text) },
      { title: '更新时间', dataIndex: 'updated_on', key: 'updated_on', width: 180, render: (text: string) => formatDateTime(text) }
    ];

    const total = data.total || data.list.length;
    const displayList = total > 100 ? data.list.slice(0, 100) : data.list;

    return (
      <div className="result-container">
        <div className="result-header">
          <Text type="secondary">共 {total} 条记录{total > 100 ? '，当前显示前100条' : ''}</Text>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            size="small"
            loading={exporting}
            onClick={() => handleExport(message)}
          >
            导出数据
          </Button>
        </div>
        <div className="table-wrapper">
          <Table
            dataSource={displayList}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 1100 }}
          />
        </div>
      </div>
    );
  };

  const renderCountResult = (data: QueryResponse['data']) => {
    const count = data?.count ?? 0;
    
    return (
      <div className="result-container count-result">
        <div className="count-display">
          <div className="count-number">{count}</div>
          <div className="count-label">个问题</div>
        </div>
      </div>
    );
  };

  const renderChartResult = (data: QueryResponse['data']) => {
    if (!data) return null;

    const hasTrendData = data.trendData && data.trendData.labels.length > 0;
    const hasSystemDistribution = data.distributionData?.systemDistribution && data.distributionData.systemDistribution.length > 0;
    const hasPriorityDistribution = data.distributionData?.priorityDistribution && data.distributionData.priorityDistribution.length > 0;

    return (
      <div className="result-container chart-container">
        {hasTrendData && (
          <div className="chart-item">
            <AntTitle level={5}>问题趋势</AntTitle>
            <div className="chart-wrapper">
              <Line
                data={{
                  labels: data.trendData!.labels,
                  datasets: data.trendData!.datasets.map((ds, index) => ({
                    ...ds,
                    borderColor: index === 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)',
                    backgroundColor: index === 0 ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1
                  }))
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        color: '#f1f5f9'
                      }
                    },
                    datalabels: {
                      display: true,
                      color: function(context: any) {
                        return context.dataset.borderColor;
                      },
                      font: {
                        weight: 'bold' as const,
                        size: 12
                      },
                      offset: 15,
                      align: 'center' as const,
                      anchor: 'end' as const,
                      formatter: function(value: any) {
                        return value;
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: {
                        color: '#94a3b8'
                      },
                      grid: {
                        color: '#334155'
                      }
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: '#94a3b8'
                      },
                      grid: {
                        color: '#334155'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}
        {(hasSystemDistribution || hasPriorityDistribution) && (
          <div className="chart-row">
            {hasSystemDistribution && (
              <div className="chart-item half">
                <AntTitle level={5}>系统分布</AntTitle>
                <div className="chart-wrapper pie-wrapper">
                  <Pie
                    data={{
                      labels: data.distributionData!.systemDistribution!.map(d => d.name),
                      datasets: [{
                        data: data.distributionData!.systemDistribution!.map(d => d.value),
                        backgroundColor: data.distributionData!.systemDistribution!.map((_, index) => {
                          const colors = [
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 206, 86, 0.8)',
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(153, 102, 255, 0.8)',
                            'rgba(255, 159, 64, 0.8)',
                            'rgba(201, 203, 207, 0.8)',
                            'rgba(231, 233, 174, 0.8)',
                            'rgba(166, 86, 40, 0.8)',
                            'rgba(247, 129, 95, 0.8)',
                            'rgba(139, 0, 0, 0.8)',
                            'rgba(0, 100, 0, 0.8)',
                            'rgba(70, 130, 180, 0.8)',
                            'rgba(218, 165, 32, 0.8)',
                            'rgba(128, 128, 0, 0.8)',
                          ];
                          return colors[index % colors.length];
                        })
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          display: false
                        }
                      }
                    }}
                  />
                </div>
                <div className="pie-legend-container">
                  <div className="pie-legend-colors">
                    {data.distributionData!.systemDistribution!.map((_, index) => {
                      const colors = [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(201, 203, 207, 0.8)',
                        'rgba(231, 233, 174, 0.8)',
                        'rgba(166, 86, 40, 0.8)',
                        'rgba(247, 129, 95, 0.8)',
                        'rgba(139, 0, 0, 0.8)',
                        'rgba(0, 100, 0, 0.8)',
                        'rgba(70, 130, 180, 0.8)',
                        'rgba(218, 165, 32, 0.8)',
                        'rgba(128, 128, 0, 0.8)',
                      ];
                      return (
                        <span
                          key={index}
                          className="pie-legend-color"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                      );
                    })}
                  </div>
                  <div className="pie-legend-labels">
                    {data.distributionData!.systemDistribution!.map((d, index) => (
                      <span key={index} className="pie-legend-label">{d.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {hasPriorityDistribution && (
              <div className="chart-item half">
                <AntTitle level={5}>优先级分布</AntTitle>
                <div className="chart-wrapper pie-wrapper">
                  <Pie
                    data={{
                      labels: data.distributionData!.priorityDistribution!.map(d => d.name),
                      datasets: [{
                        data: data.distributionData!.priorityDistribution!.map(d => d.value),
                        backgroundColor: data.distributionData!.priorityDistribution!.map(d => {
                          const name = d.name || '';
                          if (name.includes('紧急')) {
                            return 'rgba(255, 99, 132, 0.8)';
                          }
                          if (name.includes('高')) {
                            return 'rgba(255, 159, 64, 0.8)';
                          }
                          if (name.includes('中')) {
                            return 'rgba(255, 206, 86, 0.8)';
                          }
                          if (name.includes('低')) {
                            return 'rgba(75, 192, 192, 0.8)';
                          }
                          if (name.includes('未知')) {
                            return 'rgba(201, 203, 207, 0.8)';
                          }
                          return 'rgba(54, 162, 235, 0.8)';
                        })
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: { display: false }
                      }
                    }}
                  />
                </div>
                <div className="pie-legend-container">
                  <div className="pie-legend-colors">
                    {data.distributionData!.priorityDistribution!.map((d) => {
                      const name = d.name || '';
                      let color = 'rgba(54, 162, 235, 0.8)';
                      if (name.includes('紧急')) {
                        color = 'rgba(255, 99, 132, 0.8)';
                      } else if (name.includes('高')) {
                        color = 'rgba(255, 159, 64, 0.8)';
                      } else if (name.includes('中')) {
                        color = 'rgba(255, 206, 86, 0.8)';
                      } else if (name.includes('低')) {
                        color = 'rgba(75, 192, 192, 0.8)';
                      } else if (name.includes('未知')) {
                        color = 'rgba(201, 203, 207, 0.8)';
                      }
                      return (
                        <span
                          key={name}
                          className="pie-legend-color"
                          style={{ backgroundColor: color }}
                        />
                      );
                    })}
                  </div>
                  <div className="pie-legend-labels">
                    {data.distributionData!.priorityDistribution!.map((d) => (
                      <span key={d.name} className="pie-legend-label">{d.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDocumentResult = (data: QueryResponse['data']) => {
    return (
      <div className="result-container">
        <Text>文档生成任务已创建，任务ID: {data?.taskId}</Text>
        <br />
        <Button type="link" href={data?.documentUrl}>下载文档</Button>
      </div>
    );
  };

  return (
    <div className="defect-assistant-page">
      <div className="sidebar">
        <div className="sidebar-header">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={createNewSession}
            block
          >
            新建会话
          </Button>
        </div>
        <div className="session-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-card ${session.id === currentSessionId ? 'active' : ''}`}
              onClick={() => selectSession(session.id)}
            >
              <div className="session-info">
                <Text className="session-title" ellipsis>{session.title}</Text>
                <Text type="secondary" className="session-date">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </Text>
              </div>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => deleteSession(session.id, e)}
                className="delete-btn"
              />
            </div>
          ))}
        </div>
        {sessions.length > 0 && (
          <div className="sidebar-footer">
            <Button
              type="text"
              icon={<ClearOutlined />}
              onClick={clearAllSessions}
              block
              danger
            >
              清空会话
            </Button>
          </div>
        )}
      </div>
      
      <div
        className="chat-container"
        style={{
          perspective: '1200px',
          perspectiveOrigin: 'center center',
        }}
      >
        <motion.div
          className="messages-container"
          animate={{
            opacity: isFlipping ? 0 : 1,
            rotateY: isFlipping ? 90 : 0,
            scale: isFlipping ? 0.8 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            mass: 1,
          }}
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          }}
        >
          {messages.map(message => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'user' ? (
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                ) : (
                  <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#87d068' }} />
                )}
              </div>
              <Card size="small" className={`message-card ${message.type}`}>
                {message.loading ? (
                  <Spin tip="查询中..." />
                ) : (
                  <>
                    <Text>{message.content}</Text>
                    {renderResult(message)}
                  </>
                )}
              </Card>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </motion.div>

        <div className="suggestions-container">
          <Text type="secondary">快捷查询：</Text>
          <Space wrap>
            {suggestions.map((suggestion, index) => (
              <Tag
                key={index}
                className="suggestion-tag"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Tag>
            ))}
          </Space>
        </div>

        <div className="input-container">
          <TextArea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入您想查询的内容，如：查看物联应用已解决的问题"
            autoSize={{ minRows: 1, maxRows: 3 }}
            className="input-textarea"
          />
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
            >
              发送
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleClear}>
              新会话
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default DefectAssistantPage;
