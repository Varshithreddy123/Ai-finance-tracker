console.log('Enhanced Mock API with Google OAuth loaded and ready');

// Simulate database storage
let users = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password123', // In real app, this would be hashed
    phone: '+1-555-0123',
    company: 'Tech Corp',
    bio: 'Financial enthusiast and tech lover',
    profilePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    provider: 'email', // Track authentication provider
    googleId: null,
    createdAt: new Date().toISOString()
  }
];

let tokens = new Map();

// Mock Google user profiles for testing
const mockGoogleProfiles = [
  {
    googleId: 'google_123456789',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@gmail.com',
    profilePhoto: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    verified: true
  },
  {
    googleId: 'google_987654321',
    firstName: 'Mike',
    lastName: 'Chen',
    email: 'mike.chen@gmail.com',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    verified: true
  },
  {
    googleId: 'google_456789123',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@gmail.com',
    profilePhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    verified: true
  }
];

// Generate mock JWT token
const generateToken = (userId) => {
  const token = `mock_jwt_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  tokens.set(token, { userId, createdAt: Date.now() });
  return token;
};

// Validate token
const validateTokenInternal = (token) => {
  const tokenData = tokens.get(token);
  if (!tokenData) return null;
  
  // Check if token is expired (24 hours)
  if (Date.now() - tokenData.createdAt > 24 * 60 * 60 * 1000) {
    tokens.delete(token);
    return null;
  }
  
  return tokenData;
};

// Fetch Google userinfo using access token
const fetchGoogleUserInfo = async (accessToken) => {
  console.log('Fetching Google userinfo with access token');
  const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Failed to fetch Google userinfo (${resp.status}) ${text}`);
  }
  const info = await resp.json();
  return {
    googleId: info.sub,
    firstName: info.given_name || '',
    lastName: info.family_name || '',
    email: info.email,
    profilePhoto: info.picture,
    verified: !!info.email_verified
  };
};

// Mock API endpoints
export const mockApi = {
  // Login endpoint
  login: async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Don't allow Google-authenticated users to login with password
    if (user.provider === 'google' && !user.password) {
      throw new Error('Please sign in with Google for this account');
    }
    
    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      token,
      user: userWithoutPassword
    };
  },

  // Register endpoint
  register: async (userData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (users.find(u => u.email === userData.email)) {
      throw new Error('User with this email already exists');
    }
    
    const newUser = {
      id: users.length + 1,
      ...userData,
      provider: 'email',
      googleId: null,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    return {
      message: 'User registered successfully'
    };
  },

  // Forgot password endpoint
  forgotPassword: async (email) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.provider === 'google') {
      throw new Error('This account uses Google sign-in. Please use Google to sign in.');
    }
    
    console.log(`Password reset email would be sent to ${email}`);
    
    return {
      message: 'Password reset email sent'
    };
  },

  // Reset password endpoint
  resetPassword: async (token, newPassword) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`Password would be reset for token: ${token}`);
    
    return {
      message: 'Password reset successful'
    };
  },

  // Validate token endpoint
  validateToken: async (token) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const tokenData = validateTokenInternal(token);
    
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }
    
    const user = users.find(u => u.id === tokenData.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  },

  // Update profile endpoint
  updateProfile: async (token, profileData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const tokenData = validateTokenInternal(token);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }
    
    const userIndex = users.findIndex(u => u.id === tokenData.userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    users[userIndex] = {
      ...users[userIndex],
      ...profileData,
      updatedAt: new Date().toISOString()
    };
    
    const { password, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  },

  // Enhanced Google login endpoint
  googleLogin: async (googleToken) => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Slightly longer for OAuth simulation
    
    try {
      // Fetch Google user profile using access token
      const googleProfile = await fetchGoogleUserInfo(googleToken);
      
      console.log('Google profile validated:', googleProfile.email);
      
      // Check if user already exists by email or Google ID
      let existingUser = users.find(u => 
        u.email === googleProfile.email || 
        (u.googleId && u.googleId === googleProfile.googleId)
      );
      
      if (existingUser) {
        // Update existing user with Google info if needed
        if (!existingUser.googleId) {
          existingUser.googleId = googleProfile.googleId;
          existingUser.provider = 'google';
          existingUser.profilePhoto = existingUser.profilePhoto || googleProfile.profilePhoto;
          existingUser.updatedAt = new Date().toISOString();
          console.log('Linked existing account with Google:', existingUser.email);
        }
      } else {
        // Create new user from Google profile
        const newUser = {
          id: users.length + 1,
          firstName: googleProfile.firstName,
          lastName: googleProfile.lastName,
          email: googleProfile.email,
          password: null, // Google users don't have passwords
          phone: null,
          company: null,
          bio: `Joined via Google on ${new Date().toLocaleDateString()}`,
          profilePhoto: googleProfile.profilePhoto,
          provider: 'google',
          googleId: googleProfile.googleId,
          emailVerified: googleProfile.verified,
          createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        existingUser = newUser;
        console.log('Created new Google user:', existingUser.email);
      }
      
      const token = generateToken(existingUser.id);
      const { password, ...userWithoutPassword } = existingUser;
      
      return {
        token,
        user: userWithoutPassword,
        isNewUser: !users.find(u => u.email === googleProfile.email && u.id !== existingUser.id)
      };
      
    } catch (error) {
      console.error('Google login error:', error.message);
      throw error;
    }
  },

  // New: Link Google account to existing account
  linkGoogleAccount: async (token, googleToken) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const tokenData = validateTokenInternal(token);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }
    
    const userIndex = users.findIndex(u => u.id === tokenData.userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    try {
      const googleProfile = await fetchGoogleUserInfo(googleToken);
      
      // Check if Google account is already linked to another user
      const existingGoogleUser = users.find(u => u.googleId === googleProfile.googleId);
      if (existingGoogleUser && existingGoogleUser.id !== tokenData.userId) {
        throw new Error('This Google account is already linked to another account');
      }
      
      // Link Google account
      users[userIndex] = {
        ...users[userIndex],
        googleId: googleProfile.googleId,
        profilePhoto: users[userIndex].profilePhoto || googleProfile.profilePhoto,
        updatedAt: new Date().toISOString()
      };
      
      const { password, ...userWithoutPassword } = users[userIndex];
      return userWithoutPassword;
      
    } catch (error) {
      throw error;
    }
  },

  // New: Unlink Google account
  unlinkGoogleAccount: async (token) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const tokenData = validateTokenInternal(token);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }
    
    const userIndex = users.findIndex(u => u.id === tokenData.userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    if (users[userIndex].provider === 'google' && !users[userIndex].password) {
      throw new Error('Cannot unlink Google account. Please set a password first.');
    }
    
    users[userIndex] = {
      ...users[userIndex],
      googleId: null,
      updatedAt: new Date().toISOString()
    };
    
    const { password, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  }
};

// Intercept fetch calls to use mock API
const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  if (url.startsWith('/api/auth/')) {
    console.log('Mock API intercepted:', url, options.method);
    
    const endpoint = url.replace('/api/auth/', '');
    const method = options.method || 'GET';
    
    try {
      let result;
      
      switch (endpoint) {
        case 'login':
          if (method === 'POST') {
            const body = JSON.parse(options.body);
            console.log('Login attempt:', body.email);
            result = await mockApi.login(body.email, body.password);
            console.log('Login result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;
        
        case 'register':
          if (method === 'POST') {
            const body = JSON.parse(options.body);
            console.log('Register attempt:', body.email);
            result = await mockApi.register(body);
            console.log('Register result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;
          
        case 'forgot-password':
          if (method === 'POST') {
            const body = JSON.parse(options.body);
            console.log('Forgot password attempt:', body.email);
            result = await mockApi.forgotPassword(body.email);
            console.log('Forgot password result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;
          
        case 'reset-password':
          if (method === 'POST') {
            const body = JSON.parse(options.body);
            console.log('Reset password attempt');
            result = await mockApi.resetPassword(body.token, body.newPassword);
            console.log('Reset password result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;
          
        case 'validate':
          if (method === 'GET') {
            const token = options.headers?.Authorization?.replace('Bearer ', '');
            console.log('Token validation attempt:', token ? 'Token provided' : 'No token');
            if (!token) {
              return new Response(JSON.stringify({ error: 'No token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            
            result = await mockApi.validateToken(token);
            console.log('Token validation result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;
          
        case 'profile':
          if (method === 'PUT') {
            const token = options.headers?.Authorization?.replace('Bearer ', '');
            console.log('Profile update attempt:', token ? 'Token provided' : 'No token');
            if (!token) {
              return new Response(JSON.stringify({ error: 'No token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            
            const body = JSON.parse(options.body);
            result = await mockApi.updateProfile(token, body);
            console.log('Profile update result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;

        case 'google-login':
          if (method === 'POST') {
            const body = JSON.parse(options.body);
            console.log('Google login attempt with token:', body.token?.substring(0, 20) + '...');
            result = await mockApi.googleLogin(body.token);
            console.log('Google login result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;

        case 'link-google':
          if (method === 'POST') {
            const token = options.headers?.Authorization?.replace('Bearer ', '');
            if (!token) {
              return new Response(JSON.stringify({ error: 'No token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            
            const body = JSON.parse(options.body);
            console.log('Link Google account attempt');
            result = await mockApi.linkGoogleAccount(token, body.googleToken);
            console.log('Link Google account result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;

        case 'unlink-google':
          if (method === 'POST') {
            const token = options.headers?.Authorization?.replace('Bearer ', '');
            if (!token) {
              return new Response(JSON.stringify({ error: 'No token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            
            console.log('Unlink Google account attempt');
            result = await mockApi.unlinkGoogleAccount(token);
            console.log('Unlink Google account result:', result);
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          break;
      }
      
      const validEndpoints = [
        'login', 'register', 'forgot-password', 'reset-password', 
        'validate', 'profile', 'google-login', 'link-google', 'unlink-google'
      ];
      
      if (validEndpoints.includes(endpoint)) {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log('Unknown endpoint:', endpoint);
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Mock API error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return originalFetch(url, options);
};

// Helper function for testing - expose some test tokens
window.mockApiHelpers = {
  // Test Google tokens for different scenarios
  testTokens: {
    validGoogleToken: 'mock_google_token_user1_valid',
    invalidGoogleToken: 'invalid_token',
    expiredGoogleToken: 'expired_token',
    networkErrorToken: 'network_error',
    user2Token: 'mock_google_token_user2_valid',
    user3Token: 'mock_google_token_user3_valid'
  },
  
  // Get current users (for debugging)
  getUsers: () => users,
  
  // Get active tokens (for debugging)
  getTokens: () => Array.from(tokens.keys()),
  
  // Reset data
  reset: () => {
    users = [users[0]]; // Keep the original test user
    tokens.clear();
    console.log('Mock API data reset');
  }
};

console.log('Enhanced Google OAuth features available!');
console.log('Test tokens available in window.mockApiHelpers.testTokens');
console.log('Use different test tokens to simulate various Google OAuth scenarios');