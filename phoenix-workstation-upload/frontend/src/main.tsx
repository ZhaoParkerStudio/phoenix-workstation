import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';

const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#D97706',
          colorBgContainer: '#FFFFFF',
          colorText: '#1C1917',
          colorTextSecondary: '#78716C',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);