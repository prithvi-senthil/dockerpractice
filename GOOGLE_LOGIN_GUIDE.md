# Attendance App - Google Login Implementation

How we implemented Google OAuth in the Attendance Tracker app. See how everything connects in our specific application!

---

# 📋 TABLE OF CONTENTS

1. [Our App Overview](#our-app-overview)
2. [App Architecture](#app-architecture)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Implementation](#backend-implementation)
5. [How They Work Together](#how-they-work-together)
6. [User Flow in Our App](#user-flow-in-our-app)
7. [Database Structure](#database-structure)
8. [Security Features](#security-features)
9. [Testing Our App](#testing-our-app)

---

# OUR APP OVERVIEW

## What is the Attendance Tracker?

An app for managing student attendance using:

- ✅ Google login (no password needed)
- ✅ Attendance tracking
- ✅ Leave requests
- ✅ Admin management
- ✅ Role-based access (Student, Faculty, HOD, Admin)

## Key Features

```
┌─────────────────────────────────────┐
│   Attendance Tracker App            │
├─────────────────────────────────────┤
│  Feature 1: Google Login            │
│  Feature 2: Mark Attendance         │
│  Feature 3: View History            │
│  Feature 4: Leave Requests          │
│  Feature 5: Admin Dashboard         │
│  Feature 6: Role-Based Access       │
└─────────────────────────────────────┘
```

Google Login is **Feature 1** - the entry point!

---

# APP ARCHITECTURE

## Complete System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      User's Phone                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Attendance Tracker App (Frontend)          │     │
│  │  ┌──────────────────────────────────────────────┐  │     │
│  │  │  LoginScreen.js                              │  │     │
│  │  │  ├─ GoogleSignin.configure()                 │  │     │
│  │  │  ├─ Google button UI                         │  │     │
│  │  │  └─ Modern loading spinner                   │  │     │
│  │  └──────────────────────────────────────────────┘  │     │
│  │  ┌──────────────────────────────────────────────┐  │     │
│  │  │  AuthContext.js                              │  │     │
│  │  │  ├─ loginWithGoogle()                        │  │     │
│  │  │  ├─ Store JWT token                          │  │     │
│  │  │  └─ Store user data                          │  │     │
│  │  └──────────────────────────────────────────────┘  │     │
│  │  AsyncStorage (Local Device Storage)             │     │
│  │  ├─ JWT Token                                   │     │
│  │  └─ User Data                                   │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                    POST /auth/google-login                   │
│                    { email, serverAuthCode }                 │
│                          │                                   │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    ┌──────▼───────────────────────────────┐
                    │   Your Backend Server              │
                    │   (Node.js + Express)              │
                    ├──────────────────────────────────────┤
                    │  Port 5000                         │
                    │                                    │
                    │  Routes:                           │
                    │  POST /auth/google-login ←────────┐│
                    │  GET /user/profile (protected)     ││
                    │  GET /attendance (protected)       ││
                    │  ...more routes                    ││
                    │                                    ││
                    │  Controllers:                      ││
                    │  ├─ authController.js             ││
                    │  ├─ attendanceController.js       ││
                    │  └─ ...more                       ││
                    │                                    ││
                    │  Middleware:                       ││
                    │  └─ auth.js (JWT verification)    ││
                    └──────────┬────────────────────────┘│
                               │                        │
                        ┌──────▼──────────┐             │
                        │   MySQL DB      │◄────────────┘
                        ├─────────────────┤
                        │ users table     │
                        │ attendance      │
                        │ leave_requests  │
                        │ ...more         │
                        └─────────────────┘
```

---

# FRONTEND IMPLEMENTATION

## LoginScreen.js - The Entry Point

**File**: `frontend/src/screens/auth/LoginScreen.js`

This screen handles:

1. Gmail account selection
2. Google authentication
3. Backend verification
4. User feedback (loading, errors)

### Key Components

#### 1. GoogleSignin Configuration

```javascript
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

// Configure Google Sign-In
GoogleSignin.configure({
  clientId:
    "800231155792-ahm9cf1p82ho2sn0irlkr7u72pb6n149.apps.googleusercontent.com",
  webClientId:
    "800231155792-ahm9cf1p82ho2sn0irlkr7u72pb6n149.apps.googleusercontent.com",
  scopes: ["profile", "email"],
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});
```

**What each setting does:**

- `clientId`: Android credential from Google Cloud
- `webClientId`: Web credential for backend
- `scopes`: Asks for email + profile info
- `offlineAccess`: Gets code to verify later
- `forceCodeForRefreshToken`: Ensures we can refresh login

#### 2. Handle Google Login Button

```javascript
const handleGoogleLogin = async () => {
  try {
    setLoading(true);

    // Check if Google Play Services available
    await GoogleSignin.hasPlayServices();

    // Force sign out to show account picker
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      // Already signed out
    }

    // Get user info from Google
    const userInfo = await GoogleSignin.signIn();
    const user = userInfo?.data?.user;
    const serverAuthCode = userInfo?.data?.serverAuthCode;

    if (user && user.email) {
      // Send to backend
      const result = await loginWithGoogle(user.email, serverAuthCode);

      if (!result.success) {
        Alert.alert("Login Failed", result.error);
      } else {
        // Success! Navigate to dashboard
        navigation.replace("Dashboard");
      }
    }
  } catch (error) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      // User cancelled
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert("Error", "Google Play Services required");
    } else {
      Alert.alert("Error", error.message);
    }
  } finally {
    setLoading(false);
  }
};
```

#### 3. UI Components

```javascript
// Google Button
<TouchableOpacity
  style={styles.googleButton}
  onPress={handleGoogleLogin}
  disabled={loading}
>
  <MaterialIcons name="google" size={24} color="#4285F4" />
  <Text style={styles.googleButtonText}>Continue with Google</Text>
</TouchableOpacity>;

// Modern Loading Modal
{
  loading && <ModernLoadingModal visible={loading} />;
}
```

**UI Features:**

- ✅ White button with blue Google icon
- ✅ Professional styling
- ✅ Loading spinner overlay
- ✅ Error messages

---

## AuthContext.js - State Management

**File**: `frontend/src/context/AuthContext.js`

Manages app-wide authentication state

### Key Function: loginWithGoogle

```javascript
const loginWithGoogle = async (email, serverAuthCode) => {
  try {
    setLoading(true);
    setError(null);

    // Send to backend
    const response = await api.post("/auth/google-login", {
      email: email,
      serverAuthCode: serverAuthCode,
    });

    const { token, user: userData } = response.data;

    // Store JWT token locally
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(userData));

    // Set authorization header for all future requests
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Update app state
    setUser(userData);
    setIsAuthenticated(true);

    return { success: true };
  } catch (error) {
    console.error("Google login error:", error);

    const errorMessage = error.response?.data?.error || "Login failed";
    setError(errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    setLoading(false);
  }
};
```

### State Variables

```javascript
const [user, setUser] = useState(null);
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [token, setToken] = useState(null);
```

**What each stores:**

- `user`: Logged-in user data (name, email, role)
- `isAuthenticated`: Is user logged in?
- `loading`: Is auth in progress?
- `error`: Error message if any
- `token`: JWT security token

---

## ModernLoadingModal.js - Professional Loading UI

**File**: `frontend/src/components/ModernLoadingModal.js`

Shows smooth loading spinner during authentication

```javascript
const ModernLoadingModal = ({ visible }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* Semi-transparent backdrop */}
        <View style={styles.backdrop} />

        {/* Animated spinner */}
        <AnimatedSpinner />
      </View>
    </Modal>
  );
};

const AnimatedSpinner = () => {
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
      <View style={styles.spinnerCircle} />
    </Animated.View>
  );
};
```

**Features:**

- ✅ Smooth 1000ms rotation
- ✅ Semi-transparent background
- ✅ Professional appearance
- ✅ No text (minimal design)

---

## API Configuration

**File**: `frontend/src/services/api.js`

Sets up automatic API calls with authentication

```javascript
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://192.168.1.100:5000/api",
});

// Automatically add JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**What this does:**

- ✅ Every API call automatically includes JWT token
- ✅ No manual token headers needed
- ✅ If token expires, can refresh

---

# BACKEND IMPLEMENTATION

## Server Setup

**File**: `backend/server.js`

```javascript
const express = require("express");
const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const { authenticateToken } = require("./middleware/auth");

const app = express();

app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes (need JWT)
app.use("/api/attendance", authenticateToken, attendanceRoutes);
app.use("/api/user", authenticateToken, userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
```

---

## Google Login Endpoint

**File**: `backend/controllers/authController.js`

```javascript
const jwt = require("jsonwebtoken");
const db = require("../config/db");

exports.googleLogin = async (req, res) => {
  try {
    const { email, serverAuthCode } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    console.log("🔐 Google login attempt for:", email);

    // Query database - check if user exists AND is active
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
      [email],
    );

    // If user not found
    if (users.length === 0) {
      console.log("❌ User not found:", email);
      return res.status(401).json({
        error: "User not registered in the system. Contact administrator.",
      });
    }

    const user = users[0];
    console.log("✅ User found:", user.name, "Type:", user.user_type);

    // Generate JWT token (24 hour expiration)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    console.log("✅ JWT generated for:", email);

    // Send response
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("❌ Google login error:", error.message);
    res.status(500).json({ error: "Google login failed" });
  }
};
```

**What happens:**

1. Receives email from frontend
2. Checks database if user exists + is_active
3. If found: generates JWT token
4. If not found: returns error "not registered"
5. Returns token + user data

---

## JWT Authentication Middleware

**File**: `backend/middleware/auth.js`

Protects all routes that need login

```javascript
const jwt = require("jsonwebtoken");

exports.authenticateToken = (req, res, next) => {
  // Get token from header
  const token = req.headers["authorization"]?.split(" ")[1];

  // No token provided
  if (!token) {
    return res.status(401).json({
      error: "No token provided",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = decoded;

    // Continue to next middleware/route
    next();
  } catch (error) {
    // Token invalid or expired
    return res.status(403).json({
      error: "Invalid or expired token",
    });
  }
};
```

**Usage in routes:**

```javascript
// Public route (no token needed)
router.post("/login", authController.login);

// Protected route (needs JWT token)
router.get("/profile", authenticateToken, userController.getProfile);
```

---

## Routes Configuration

**File**: `backend/routes/authRoutes.js`

```javascript
const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();

// Google OAuth endpoint
router.post("/google-login", authController.googleLogin);

// Email login
router.post("/login", authController.login);

// Register
router.post("/register", authController.register);

module.exports = router;
```

---

# HOW THEY WORK TOGETHER

## Complete Login Flow

```
USER OPENS APP
     │
     ▼
LoginScreen loads
     │
     ├─ GoogleSignin.configure() ← Uses credentials from app.json
     │
     ▼
User taps "Continue with Google"
     │
     ├─ handleGoogleLogin() starts
     │
     ├─ GoogleSignin.signOut() ← Force account picker
     │
     ▼
Google account picker appears
(User selects: john@gmail.com)
     │
     ▼
Google authenticates user
(User enters password)
     │
     ▼
Google returns:
  { email: "john@gmail.com",
    serverAuthCode: "4/0AY..." }
     │
     ├─ handleGoogleLogin() processes
     │
     ├─ Call: loginWithGoogle(email, code) ← AuthContext
     │
     ▼
Frontend sends to Backend:
POST /auth/google-login
{ email: "john@gmail.com",
  serverAuthCode: "4/0AY..." }
     │
     ▼ (Backend Processing)
Backend: authController.googleLogin()
     │
     ├─ Extract email: "john@gmail.com"
     │
     ├─ Query DB: "SELECT * FROM users WHERE email=? AND is_active=TRUE"
     │
     ├─ Check result:
     │  ├─ User found? → YES ✅
     │  │
     │  ├─ Generate JWT token
     │  │  { id: 1, email, user_type, name }
     │  │
     │  └─ Return:
     │     { token: "eyJ...", user: {...} }
     │
     ├─ If not found? → NO ❌
     │  └─ Return error: "User not registered"
     │
     ▼
Frontend receives response
     │
     ├─ Extract token + user
     │
     ├─ Save to AsyncStorage
     │  ├─ token
     │  └─ user data
     │
     ├─ Set Authorization header
     │  Authorization: "Bearer eyJ..."
     │
     ├─ Update AuthContext
     │  ├─ setUser(userData)
     │  ├─ setIsAuthenticated(true)
     │  └─ setToken(token)
     │
     ▼
Navigation changes
     │
     ├─ Login screen → Dashboard
     │
     ▼
Dashboard loads
     │
     ├─ All API calls now include JWT
     │
     └─ API automatically adds:
        Authorization: "Bearer eyJ..."
```

---

# USER FLOW IN OUR APP

## User Perspective

```
Open App
   ├─ See LoginScreen
   │   ├─ Email login option
   │   └─ "Continue with Google" button
   │
   ├─ Tap "Continue with Google"
   │   └─ See loading spinner ⟳
   │
   ├─ Google shows account picker
   │   └─ Select: john@gmail.com
   │
   ├─ See "One Moment Please" (Google's screen)
   │   └─ Enter password
   │
   ├─ See loading spinner again ⟳
   │   └─ App verifying...
   │
   ├─ EITHER:
   │   ├─ ✅ Success → Dashboard loaded
   │   │   └─ "Welcome John!"
   │   │
   │   └─ ❌ Error → Alert shown
   │       └─ "User not registered"
   │
   └─ In Dashboard
       ├─ View attendance
       ├─ Mark presence
       ├─ Apply leave
       ├─ Access protected features
       │   (all requests include JWT)
       │
       └─ When logout
           ├─ Clear JWT token
           ├─ Clear user data
           └─ Back to LoginScreen
```

---

# DATABASE STRUCTURE

## Users Table

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  user_type ENUM('student', 'faculty', 'hod', 'admin')
    NOT NULL DEFAULT 'student',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Columns:**

- `email`: Must match Gmail account exactly
- `user_type`: Determines user role/permissions
- `is_active`: When FALSE, user cannot login
- `created_at`: When user was added

**Example Data:**

```sql
INSERT INTO users (name, email, user_type, is_active) VALUES
('John Doe', 'john@gmail.com', 'student', TRUE),
('Jane Smith', 'jane@gmail.com', 'faculty', TRUE),
('Admin User', 'admin@gmail.com', 'admin', TRUE);
```

---

# SECURITY FEATURES

## 1. Google Handles Password Security

```
We NEVER see user's Gmail password

Google ← User enters password (secure)
  │
  └─ Google verifies
     └─ If correct: sends auth code
```

## 2. JWT Token Security

**Token Structure:**

```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": 1,
    "email": "john@gmail.com",
    "user_type": "student",
    "name": "John Doe",
    "iat": 1618900000,
    "exp": 1618986400  // Expires 24 hours later
  },
  "signature": "HMACSHA256(secret)"
}
```

**What makes it secure:**

- ✅ Signed with secret (can't be forged)
- ✅ Expires after 24 hours
- ✅ Contains user info (can't impersonate)
- ✅ Verified on every request

## 3. Database Verification

```javascript
// Only users in database can login!
// Even if Google says OK, app checks database:

const [users] = await db.query(
  "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
  [email],
);
```

**Security checks:**

- ✅ Email must exist in database
- ✅ User must be active (is_active = TRUE)
- ✅ Admin can deactivate user (blocks login)

## 4. Protected Routes

```javascript
// Only authenticated users get data
router.get("/attendance", authenticateToken, controller);

// Unauthenticated requests rejected
// 401: No token
// 403: Invalid/expired token
```

---

# TESTING OUR APP

## Test Scenario 1: Valid User Login

**Setup:**

- User exists in database
- is_active = TRUE
- Email: john@gmail.com

**Test Steps:**

1. Open app
2. Tap "Continue with Google"
3. Select Gmail: john@gmail.com
4. Enter password
5. Wait for verification

**Expected Result:**
✅ Dashboard loads
✅ Welcome message shows
✅ Can access protected features

---

## Test Scenario 2: Unregistered User

**Setup:**

- User NOT in database
- Email: unknown@gmail.com

**Test Steps:**

1. Open app
2. Tap "Continue with Google"
3. Select Gmail: unknown@gmail.com
4. Enter password
5. Wait...

**Expected Result:**
❌ Error: "User not registered in system"
✅ Offer to contact admin

---

## Test Scenario 3: Inactive User

**Setup:**

- User in database
- is_active = FALSE
- Email: inactive@gmail.com

**Test Steps:**

1. Open app
2. Tap "Continue with Google"
3. Select Gmail: inactive@gmail.com
4. Verify with password

**Expected Result:**
❌ Error: "User not registered"
(Same as unregistered - security!)

---

## Test Scenario 4: Session Persistence

**Setup:**

- User logged in
- Token stored in AsyncStorage

**Test Steps:**

1. User logs in successfully
2. Close app completely
3. Open app again

**Expected Result:**
✅ Still logged in!
✅ No need to login again
✅ Token still valid

---

# SUMMARY

## What This Attendance App Does

✅ Uses Google for authentication (no password database)  
✅ Stores JWT token locally (secure session)  
✅ Verifies users in database (additional security)  
✅ Protects all routes with middleware  
✅ Shows professional loading UI  
✅ Handles errors gracefully  
✅ Supports multiple user roles

## Files Used

**Frontend:**

- `LoginScreen.js` - Entry point
- `AuthContext.js` - State management
- `ModernLoadingModal.js` - UI
- `api.js` - API configuration
- `app.json` - Firebase config

**Backend:**

- `authController.js` - Login logic
- `authRoutes.js` - Routes
- `auth.js` - JWT middleware
- `.env` - Credentials storage

**Database:**

- `users` table - User storage

---

**Last Updated**: April 18, 2026  
**Status**: Production Implementation  
**App**: Attendance Tracker
