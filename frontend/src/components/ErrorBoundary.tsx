import { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { frontendLogger, LogCategory } from '../utils/logger';

const { Title, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误日志
    frontendLogger.error(
      LogCategory.ERROR,
      'React Error Boundary caught an error',
      error,
      {
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    );

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    frontendLogger.debug(LogCategory.USER_ACTION, 'error_boundary_reload', {
      url: window.location.href
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '24px'
        }}>
          <Result
            status="error"
            title="系统出现错误"
            subTitle="很抱歉，系统遇到了一些问题。请尝试刷新页面或联系技术支持。"
            extra={[
              <Button 
                key="reload" 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
              >
                刷新页面
              </Button>
            ]}
          >
            <div style={{ textAlign: 'left', maxWidth: 600 }}>
              <Title level={4}>错误详情</Title>
              <Paragraph>
                <strong>错误信息：</strong>
                <br />
                {this.state.error?.message || '未知错误'}
              </Paragraph>
              <Paragraph>
                <strong>错误时间：</strong>
                <br />
                {new Date().toLocaleString()}
              </Paragraph>
              <Paragraph>
                <strong>页面地址：</strong>
                <br />
                {window.location.href}
              </Paragraph>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <Paragraph>
                  <strong>组件堆栈：</strong>
                  <br />
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </Paragraph>
              )}
            </div>
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

// 使用示例：
// 在App.tsx或其他根组件中使用：
// import { ErrorBoundary } from './components/ErrorBoundary';
// 
// <ErrorBoundary>
//   <YourApp />
// </ErrorBoundary>

export default ErrorBoundary;