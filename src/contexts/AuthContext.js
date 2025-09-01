import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Helper to handle API requests
const apiRequest = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return { success: false, error: errorData?.message || `Request failed with status ${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } catch (err) {
    console.error('API Request Error:', err);
    return { success: false, error: err.message || 'Network error occurred' };
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('token') : null));
  const [loading, setLoading] = useState(true);
  const [googleError, setGoogleError] = useState(null);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  const validateToken = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    const { success, data } = await apiRequest('/api/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (success) {
      const user = data.user || data;
      setCurrentUser(user);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
      }
    } else logout();
    setLoading(false);
  }, [token, logout]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const login = async (email, password) => {
    const { success, data, error } = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (success) {
      const { token: newToken, user } = data;
      setToken(newToken);
      setCurrentUser(user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', newToken);
        try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
      }
      return { success: true };
    }

    return { success: false, error };
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log('Google OAuth Success:', tokenResponse);
        setGoogleError(null);
        
        // Send the access token to your backend
        const result = await apiRequest('/api/auth/google-login', {
          method: 'POST',
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });

        console.log('Backend response:', result);

        if (result.success && result.data) {
          const { token: newToken, user } = result.data;
          if (newToken && user) {
            setToken(newToken);
            setCurrentUser(user);
            if (typeof window !== 'undefined') {
              localStorage.setItem('token', newToken);
              try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
            }
            console.log('Google login successful');
          } else {
            console.error('Missing token or user data:', result.data);
            setGoogleError('Invalid response from server');
          }
        } else {
          console.error('Google login failed:', result.error);
          setGoogleError(result.error || 'Google authentication failed');
        }
      } catch (error) {
        console.error('Google login error:', error);
        setGoogleError('An unexpected error occurred during Google login');
      }
    },
    onError: (errorResponse) => {
      console.error('Google OAuth error:', errorResponse);
      setGoogleError('Google sign-in was cancelled or failed');
    },
  });

  const register = async (firstName, lastName, email, password) => {
    const { success, data, error } = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    return success
      ? { success: true, message: data.message || 'Registration successful' }
      : { success: false, error };
  };

  const updateProfile = async (updates) => {
    if (!token) return { success: false, error: 'Not authenticated' };
    const { success, data, error } = await apiRequest('/api/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });

    if (success) {
      const updatedUser = { ...currentUser, ...(data?.user || {}), ...updates };
      setCurrentUser(updatedUser);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('user', JSON.stringify(updatedUser)); } catch {}
      }
      return { success: true, data: updatedUser };
    }
    return { success: false, error };
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      token,
      loading,
      googleError,
      login,
      register,
      logout,
      googleLogin,
      updateProfile,
      clearGoogleError: () => setGoogleError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
};