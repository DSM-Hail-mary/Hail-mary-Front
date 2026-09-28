import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/tokens.app.css';
import './styles/base.css';
import { createHttpApi } from './api/httpApi';
import { createMockApi } from './api/mock/mockApi';
import { App } from './app/App';
import { config } from './config';
import { registerTileCache } from './features/map/tileCache';

const api = config.apiMode === 'http' ? createHttpApi(config.apiBase) : createMockApi({ initialSync: config.mockSync });

registerTileCache();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
);
