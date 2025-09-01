# AI Finance Tracker with JWT Authentication

A React-based finance tracking application with comprehensive JWT authentication system.

## Features

### 🔐 Authentication System
- **JWT Token-based Authentication**
- **User Registration & Login**
- **Password Reset (Forgot Password)**
- **User Profile Management**
- **Protected Routes**
- **Automatic Token Validation**

### 🎨 UI Components
- **Responsive Design** with custom CSS utility classes
- **Modern Sidebar** with navigation
- **User Profile Display**
- **Form Validation** with error handling
- **Loading States** and success messages

### 🚀 Technical Features
- **React Context API** for state management
- **Custom Hook** (`useAuth`) for authentication
- **Mock API** for demonstration
- **Local Storage** for token persistence
- **Responsive Design** for mobile and desktop

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd finance-ai-tracker

# Install dependencies
npm install

# Start the development server
npm start
```

### Demo Credentials
For testing purposes, you can use these demo credentials:

**Login:**
- Email: `john@example.com`
- Password: `password123`

**Or create a new account** using the registration form.

## Authentication Flow

### 1. User Registration
- Navigate to the registration form
- Fill in required fields (First Name, Last Name, Email, Password)
- Password confirmation validation
- Success message and redirect to login

### 2. User Login
- Enter email and password
- JWT token generation and storage
- Automatic redirect to main application
- Token validation on app start

### 3. Password Reset
- Click "Forgot your password?" on login form
- Enter email address
- Mock email sending (check console for demo)
- Password reset functionality

### 4. User Profile
- View and edit profile information
- Update personal details
- Real-time form validation
- Success/error message handling

### 5. Logout
- Click logout button in header or sidebar
- Token removal from local storage
- Redirect to login form

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── Auth.jsx          # Main auth component
│   │   ├── Login.jsx         # Login form
│   │   ├── Register.jsx      # Registration form
│   │   ├── ForgotPassword.jsx # Password reset
│   │   └── UserProfile.jsx   # User profile management
│   └── ui/
│       └── button.jsx        # Custom button component
├── contexts/
│   └── AuthContext.js        # Authentication context
├── _components/
│   ├── Header.js             # App header with user info
│   ├── Sidebar.jsx           # Navigation sidebar
│   ├── Hero.jsx              # Landing page hero
│   └── Footer.js             # App footer
├── mockApi.js                # Mock API for demonstration
├── App.js                    # Main application component
└── index.js                  # Application entry point
```

## API Endpoints

The application uses mock API endpoints that simulate real backend functionality:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/validate` - Token validation
- `PUT /api/auth/profile` - Profile update

## Customization

### Styling
- All styles use custom CSS utility classes
- Color scheme defined in `src/index.css`
- Responsive breakpoints for mobile and desktop
- Gradient backgrounds and modern UI elements

### Authentication
- JWT token structure can be modified in `mockApi.js`
- Token expiration time (currently 24 hours)
- User data structure in the mock database

## Security Features

- **JWT Token Validation** on every app start
- **Automatic Logout** on token expiration
- **Protected Routes** for authenticated users only
- **Form Validation** for all user inputs
- **Error Handling** for failed API calls

## Future Enhancements

- [ ] Real backend integration
- [ ] OAuth providers (Google, GitHub, etc.)
- [ ] Two-factor authentication
- [ ] Email verification
- [ ] Role-based access control
- [ ] Session management
- [ ] API rate limiting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue in the repository.
