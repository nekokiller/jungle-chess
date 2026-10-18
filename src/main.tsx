import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { audio } from './audio/manager';
import './styles/global.css';

// 先下載音檔；第一次點擊或按鍵時才開始發聲。
audio.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
