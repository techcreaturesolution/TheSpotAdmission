import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './lib/auth.jsx';
import { CompareProvider } from './lib/compare.jsx';
import { I18nProvider } from './lib/i18n.jsx';
import { ToastProvider } from './components/Toast.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <CompareProvider>
              <App />
            </CompareProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
