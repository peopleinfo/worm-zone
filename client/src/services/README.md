# MOS SDK Integration Guide

This project integrates MOS SDK login functionality for automatic user authentication.

## Configuration

### 1. Environment Variables

Configure your MOS SDK settings using environment variables. Copy `.env.example` to `.env` and update the values:

```bash
# Your MOS app key from the MOS developer console
VITE_MOS_APP_KEY=your_actual_app_key

# Backend login endpoint URL
VITE_BACKEND_LOGIN_URL=https://your-backend.com/api/login/miniAppLogin
```

### 2. Backend API Requirements

The backend login endpoint should:
- Accept POST requests
- Request body format: `{ "code": "login_code_from_MOS_SDK" }`
- Response format: `{ "data": "user_token" }`

### 3. MOS SDK Script

Ensure the MOS SDK is included in `index.html`:

```html
<script src="https://cdn-oss.mos.me/public/js/mos-1.1.0.js"></script>
```

## How It Works

1. **Automatic Detection**: Game checks login status on startup
2. **Auto Login**: If MOS SDK is available and user not logged in, automatically attempts login
3. **Guest Mode**: If login fails or MOS SDK unavailable, continues as guest
4. **Token Storage**: Successful login saves token to localStorage
5. **Persistent Session**: Token persists across page refreshes

## API Reference

### AuthService Methods

- `login()`: Execute login flow with MOS SDK
- `getToken()`: Get current user token
- `isLoggedIn()`: Check if user is logged in
- `logout()`: Log out user and clear token
- `setAppKey(appKey)`: Set MOS app key
- `setBackendUrl(url)`: Set backend login endpoint URL

### Components

- `GameLayout`: Main game layout with integrated auto-login functionality

## Customization

To modify login behavior, adjust the auto-login logic in `GameLayout.tsx`:

```typescript
// Modify login detection delay (milliseconds)
const timer = setTimeout(autoLogin, 1000);

// Customize auto-login conditions
if (typeof window.mos !== 'undefined') {
  try {
    await authService.login();
  } catch (error) {
    // Handle login failure
  }
}
```

## Important Notes

1. Ensure MOS SDK loads before component initialization
2. Backend API must handle CORS properly
3. Token automatically persists in localStorage
4. Login failures are logged to console, game continues as guest
5. No user interaction required - login happens automatically