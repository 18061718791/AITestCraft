import React from 'react';
import { ConfigProvider } from 'antd';
import { AppProvider } from './contexts/AppContext';
import HomePage from './pages/HomePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <ErrorBoundary>
        <AppProvider>
          <HomePage />
        </AppProvider>
      </ErrorBoundary>
    </ConfigProvider>
  );
};

export default App;