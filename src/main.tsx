// AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
