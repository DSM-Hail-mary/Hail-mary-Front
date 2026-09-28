import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/tokens.app.css';
import './styles/base.css';
import { createHttpApi } from './api/httpApi';
import { createMockApi, EMPTY_DATASET } from './api/mock/mockApi';
import { App } from './app/App';
import { config } from './config';
import { registerTileCache } from './features/map/tileCache';

// 테스트 전용 예시 데이터는 요청했을 때만 따로 불러온다 (기본 실행·배포 빌드에는 가짜 전주가 없다).
const dataset = config.mockSampleData ? (await import('./api/mock/sampleData')).createSampleDataset() : EMPTY_DATASET;

const api =
  config.apiMode === 'http' ? createHttpApi(config.apiBase) : createMockApi({ dataset, initialSync: config.mockSync });

registerTileCache();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
);
