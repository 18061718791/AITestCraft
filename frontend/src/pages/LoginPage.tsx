import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { authApiService } from '../services/authApi';
import CyberBot, { type BotState } from '../components/CyberBot';

// Extend BotState for internal use
type ExtendedBotState = BotState | 'password-hidden';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [botState, setBotState] = useState<ExtendedBotState>('idle');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [form] = Form.useForm();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Use refs for debouncing to avoid re-renders
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const prevVisibleRef = useRef(false);

  const from = (location.state as any)?.from?.pathname || '/';

  // Clear typing state after delay
  const clearTypingState = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setBotState('watching');
    }, 1500);
  }, []);

  // Handle field focus
  const handleFieldFocus = useCallback((field: string) => {
    setFocusedField(field);
    if (field === 'password') {
      if (passwordVisible) {
        // Password field focused and visible - peeking state
        setBotState('password-visible');
      } else {
        // Password field focused but hidden - avoiding state
        setBotState('password-hidden');
      }
    } else {
      setBotState('typing');
    }
  }, [passwordVisible]);

  // Handle field blur
  const handleFieldBlur = useCallback(() => {
    setFocusedField(null);
    // 密码可见状态下失去焦点也保持黄色光晕
    if (!passwordVisible) {
      clearTypingState();
    }
  }, [clearTypingState, passwordVisible]);

  // Handle field input - with debounce
  const handleFieldChange = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
    }
    // Keep typing state active
    if (focusedField === 'password') {
      if (passwordVisible) {
        setBotState('password-visible');
        // 密码可见状态下不清除状态，保持黄色光晕
        return;
      } else {
        setBotState('password-hidden');
      }
    } else {
      setBotState('typing');
    }
    clearTypingState();
  }, [clearTypingState, focusedField, passwordVisible]);

  // Handle password visibility toggle
  const handlePasswordVisibilityChange = useCallback((visible: boolean) => {
    // Only trigger when visibility actually changes
    if (visible !== prevVisibleRef.current) {
      prevVisibleRef.current = visible;
      setPasswordVisible(visible);
      if (visible) {
        // Password shown - robot peeks
        setBotState('password-visible');
      } else {
        // Password hidden - robot avoids looking
        setBotState('password-hidden');
        clearTypingState();
      }
    }
  }, [clearTypingState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    setBotState('watching');
    try {
      await login(values.username, values.password);
      setBotState('success');
      message.success('登录成功');
      setTimeout(() => navigate(from, { replace: true }), 800);
    } catch (error: any) {
      setBotState('error');
      message.error(error.response?.data?.error?.message || '登录失败');
      setTimeout(() => setBotState('idle'), 2500);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      setBotState('error');
      message.error('两次密码输入不一致');
      setTimeout(() => setBotState('idle'), 2500);
      return;
    }
    setLoading(true);
    try {
      await authApiService.register({
        username: values.username,
        email: values.email,
        password: values.password,
      });
      setBotState('success');
      message.success('注册成功，请登录');
      setActiveTab('login');
      form.resetFields();
    } catch (error: any) {
      setBotState('error');
      message.error(error.response?.data?.error?.message || '注册失败');
      setTimeout(() => setBotState('idle'), 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite',
        }}
      />

      {/* Scanning line effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(6, 182, 212, 0.03) 50%, transparent 100%)',
          backgroundSize: '100% 200%',
          animation: 'scanLine 4s ease-in-out infinite',
        }}
      />

      {/* Corner decorations */}
      <div style={{ position: 'absolute', top: 20, left: 20, width: 60, height: 60, borderTop: '2px solid rgba(6, 182, 212, 0.4)', borderLeft: '2px solid rgba(6, 182, 212, 0.4)' }} />
      <div style={{ position: 'absolute', top: 20, right: 20, width: 60, height: 60, borderTop: '2px solid rgba(6, 182, 212, 0.4)', borderRight: '2px solid rgba(6, 182, 212, 0.4)' }} />
      <div style={{ position: 'absolute', bottom: 20, left: 20, width: 60, height: 60, borderBottom: '2px solid rgba(6, 182, 212, 0.4)', borderLeft: '2px solid rgba(6, 182, 212, 0.4)' }} />
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderBottom: '2px solid rgba(6, 182, 212, 0.4)', borderRight: '2px solid rgba(6, 182, 212, 0.4)' }} />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 60,
          zIndex: 10,
          padding: 40,
        }}
      >
        {/* Left side - Bot */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 360,
              height: 360,
              position: 'relative',
            }}
          >
            <CyberBot state={botState} intensity={0.7} />
          </div>
          <div
            style={{
              textAlign: 'center',
              color: 'rgba(6, 182, 212, 0.8)',
              fontSize: 14,
              fontFamily: 'monospace',
              letterSpacing: 2,
            }}
          >
            <div style={{ animation: 'pulse 2s ease-in-out infinite' }}>
              {botState === 'idle' && 'SYSTEM STANDBY'}
              {botState === 'typing' && 'INPUT DETECTED...'}
              {botState === 'watching' && 'MONITORING...'}
              {botState === 'error' && 'ACCESS DENIED'}
              {botState === 'success' && 'ACCESS GRANTED'}
              {botState === 'password-hidden' && 'AVOIDING SENSITIVE DATA...'}
              {botState === 'password-visible' && 'PEEKING DETECTED...'}
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div
          style={{
            width: 420,
            padding: 40,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top glow line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.6), transparent)',
            }}
          />

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1
              style={{
                color: '#fff',
                fontSize: 28,
                fontWeight: 700,
                margin: 0,
                letterSpacing: 4,
                textShadow: '0 0 20px rgba(6, 182, 212, 0.5)',
              }}
            >
              AITestCraft
            </h1>
            <p
              style={{
                color: 'rgba(6, 182, 212, 0.6)',
                fontSize: 12,
                marginTop: 8,
                letterSpacing: 6,
                fontFamily: 'monospace',
              }}
            >
              AUTOMATION TEST PLATFORM
            </p>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            style={{ marginBottom: 24 }}
            items={[
              {
                key: 'login',
                label: (
                  <span style={{ color: activeTab === 'login' ? '#06b6d4' : 'rgba(255,255,255,0.5)' }}>
                    登录
                  </span>
                ),
                children: (
                  <Form onFinish={handleLogin} layout="vertical" form={form}>
                    <Form.Item
                      name="username"
                      rules={[{ required: true, message: '请输入用户名或邮箱' }]}
                    >
                      <Input
                        prefix={<UserOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />}
                        placeholder="用户名或邮箱"
                        size="large"
                        onFocus={() => handleFieldFocus('username')}
                        onBlur={handleFieldBlur}
                        onChange={handleFieldChange}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          color: '#fff',
                        }}
                        styles={{
                          input: {
                            color: '#fff',
                            background: 'transparent',
                            paddingLeft: 12,
                          },
                        }}
                      />
                    </Form.Item>
                    <style>{`
                      .ant-input-affix-wrapper .ant-input-suffix {
                        position: absolute;
                        right: 12px;
                        top: 50%;
                        transform: translateY(-50%);
                      }
                      .ant-input-affix-wrapper .ant-input-suffix .anticon {
                        cursor: pointer;
                        font-size: 16px;
                        transition: color 0.3s;
                      }
                      .ant-input-affix-wrapper .ant-input-suffix .anticon:hover {
                        color: rgba(6, 182, 212, 1) !important;
                      }
                    `}</style>
                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />}
                        placeholder="密码"
                        size="large"
                        onFocus={() => handleFieldFocus('password')}
                        onBlur={handleFieldBlur}
                        onChange={handleFieldChange}
                        visibilityToggle={{ visible: passwordVisible, onVisibleChange: handlePasswordVisibilityChange }}
                        iconRender={(visible) => visible ? (
                          <EyeOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />
                        ) : (
                          <EyeInvisibleOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />
                        )}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          color: '#fff',
                        }}
                        styles={{
                          input: {
                            color: '#fff',
                            background: 'transparent',
                            paddingLeft: 12,
                          },
                        }}
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        size="large"
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                          border: 'none',
                          fontWeight: 600,
                          letterSpacing: 2,
                          boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                        }}
                      >
                        登 录
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: 'register',
                label: (
                  <span style={{ color: activeTab === 'register' ? '#06b6d4' : 'rgba(255,255,255,0.5)' }}>
                    注册
                  </span>
                ),
                children: (
                  <Form onFinish={handleRegister} layout="vertical">
                    <Form.Item
                      name="username"
                      rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '用户名至少3位' }]}
                    >
                      <Input
                        prefix={<UserOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />}
                        placeholder="用户名"
                        size="large"
                        onFocus={() => handleFieldFocus('username')}
                        onBlur={handleFieldBlur}
                        onChange={handleFieldChange}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          color: '#fff',
                        }}
                        styles={{
                          input: {
                            color: '#fff',
                            background: 'transparent',
                            paddingLeft: 12,
                          },
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      rules={[
                        { type: 'email', message: '请输入有效的邮箱地址' },
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />}
                        placeholder="邮箱（可选）"
                        size="large"
                        onFocus={() => handleFieldFocus('email')}
                        onBlur={handleFieldBlur}
                        onChange={handleFieldChange}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          color: '#fff',
                        }}
                        styles={{
                          input: {
                            color: '#fff',
                            background: 'transparent',
                            paddingLeft: 12,
                          },
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />}
                        placeholder="密码"
                        size="large"
                        onFocus={() => handleFieldFocus('password')}
                        onBlur={handleFieldBlur}
                        onChange={handleFieldChange}
                        visibilityToggle={{ visible: passwordVisible, onVisibleChange: handlePasswordVisibilityChange }}
                        iconRender={(visible) => visible ? (
                          <EyeOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />
                        ) : (
                          <EyeInvisibleOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />
                        )}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          color: '#fff',
                        }}
                        styles={{
                          input: {
                            color: '#fff',
                            background: 'transparent',
                            paddingLeft: 12,
                          },
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      name="confirmPassword"
                      rules={[{ required: true, message: '请确认密码' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />}
                        placeholder="确认密码"
                        size="large"
                        onFocus={() => handleFieldFocus('confirmPassword')}
                        onBlur={handleFieldBlur}
                        onChange={handleFieldChange}
                        visibilityToggle={{ visible: passwordVisible, onVisibleChange: handlePasswordVisibilityChange }}
                        iconRender={(visible) => visible ? (
                          <EyeOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />
                        ) : (
                          <EyeInvisibleOutlined style={{ color: 'rgba(6, 182, 212, 0.6)' }} />
                        )}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          color: '#fff',
                        }}
                        styles={{
                          input: {
                            color: '#fff',
                            background: 'transparent',
                            paddingLeft: 12,
                          },
                        }}
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        size="large"
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                          border: 'none',
                          fontWeight: 600,
                          letterSpacing: 2,
                          boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                        }}
                      >
                        注 册
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />


        </div>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        @keyframes scanLine {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 0% 100%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
