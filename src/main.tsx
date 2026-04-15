import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SerialProvider } from './contexts/SerialContext.tsx';
import { SettingsProvider } from './contexts/SettingsContext.tsx';
import { CtfProvider } from './contexts/CtfContext.tsx';
import { InventoryProvider } from './contexts/InventoryContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <SerialProvider>
        <InventoryProvider>
          <CtfProvider>
            <App />
          </CtfProvider>
        </InventoryProvider>
      </SerialProvider>
    </SettingsProvider>
  </StrictMode>,
);
