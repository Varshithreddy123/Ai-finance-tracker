import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';

const Auth = () => {
  const [currentView, setCurrentView] = useState('login');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return (
          <Login
            onSwitchToRegister={() => setCurrentView('register')}
            onSwitchToForgotPassword={() => setCurrentView('forgot-password')}
          />
        );
      case 'register':
        return (
          <Register
            onSwitchToLogin={() => setCurrentView('login')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPassword
            onSwitchToLogin={() => setCurrentView('login')}
          />
        );
      default:
        return <Login />;
    }
  };

  return (
    <div>
      {renderCurrentView()}
    </div>
  );
};

export default Auth;
