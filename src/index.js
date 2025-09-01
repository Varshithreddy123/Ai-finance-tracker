import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/enhancements.css';
import App from './App';
import './mockApi'; // Load mock API first
import { AuthProvider } from './contexts/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom'; // <-- import BrowserRouter

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="317260983581-8d7kjo5u2mcj5elmuj5pu23fu106gsnm.apps.googleusercontent.com">
      <AuthProvider>
        <BrowserRouter>   {/* 👈 Wrap App with Router */}
          <App />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
