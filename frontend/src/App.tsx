import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LayoutModeProvider } from './contexts/LayoutModeContext';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TodoReminderToast } from './components/todoReminder/TodoReminderToast';
import { useTodoReminderPolling } from './hooks/useTodoReminderPolling';
import { useDeploymentNotification } from './hooks/useDeploymentNotification';
import { DeploymentNotificationToast } from './components/deployment/DeploymentNotificationToast';
import storage from './services/todoReminder/storage';
import './styles/variables.css';
import './styles/global.css';
import './App.css';

// 内部组件，用于获取主题配置和各类提醒
const ThemedApp: React.FC = () => {
  const { themeConfig } = useTheme();

  // 待办提醒
  const { isToastVisible, newTodoData, hideToast } = useTodoReminderPolling();
  const todoConfig = storage.getConfig();
  const todoAutoHideDelay = todoConfig.autoHideDelay || 5000;

  // 待部署应用提醒（全局）
  const {
    isVisible: isDeploymentVisible,
    notificationData: deploymentData,
    hideNotification: hideDeployment
  } = useDeploymentNotification();

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AppProvider>
        <div className="app-container">
          <AppRoutes />
          {/* 待办提醒弹窗 */}
          <TodoReminderToast
            visible={isToastVisible}
            newTodoData={newTodoData}
            onClose={hideToast}
            autoCloseDelay={todoAutoHideDelay}
          />
          {/* 待部署应用提醒弹窗（全局） */}
          <DeploymentNotificationToast
            visible={isDeploymentVisible}
            data={deploymentData}
            onClose={hideDeployment}
            autoCloseDelay={5000}
          />
        </div>
      </AppProvider>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LayoutModeProvider>
          <BrowserRouter>
            <AuthProvider>
              <ThemedApp />
            </AuthProvider>
          </BrowserRouter>
        </LayoutModeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
