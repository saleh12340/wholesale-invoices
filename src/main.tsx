import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startCustomerInvoicesEnhancer } from './utils/customerInvoicesEnhancer';
import { startExportAndShareEnhancer } from './utils/exportAndShareEnhancer';
import { startSettingsEnhancer } from './utils/settingsEnhancer';
import { startAppCreativeEnhancer } from './utils/appCreativeEnhancer';
import { startBluetoothOnlyEnhancer } from './utils/bluetoothOnlyEnhancer';
import { startInvoiceCustomerWorkflowEnhancer } from './utils/invoiceCustomerWorkflowEnhancer';
import { startTopBluetoothPrinterEnhancer } from './utils/topBluetoothPrinterEnhancer';

// The small Bluetooth thermal printer is the primary printer profile.
try {
  const raw = JSON.parse(localStorage.getItem('azizi_app_settings') || '{}');
  if (!raw.thermalWidth) {
    raw.thermalWidth = '58mm';
    localStorage.setItem('azizi_app_settings', JSON.stringify(raw));
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startCustomerInvoicesEnhancer();
startExportAndShareEnhancer();
startSettingsEnhancer();
startAppCreativeEnhancer();
startBluetoothOnlyEnhancer();
startInvoiceCustomerWorkflowEnhancer();
startTopBluetoothPrinterEnhancer();
