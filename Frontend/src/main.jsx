import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UnreadMessagesProvider } from './context/UnreadMessagesContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UnreadMessagesProvider>
          <App />
        </UnreadMessagesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
