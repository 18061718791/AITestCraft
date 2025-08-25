import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AppProvider } from './contexts/AppContext';
import { AppRoutes } from './routes/AppRoutes';
import { themeConfig } from './styles/theme';
import './styles/variables.css';
import './styles/global.css';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AppProvider>
        <BrowserRouter>
          <div className="app-container">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </AppProvider>
    </ConfigProvider>
  );
};

export default App;