import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startCustomerInvoicesEnhancer } from './utils/customerInvoicesEnhancer';
import { startExportAndShareEnhancer } from './utils/exportAndShareEnhancer';
import { startSettingsEnhancer } from './utils/settingsEnhancer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startCustomerInvoicesEnhancer();
startExportAndShareEnhancer();
startSettingsEnhancer();
