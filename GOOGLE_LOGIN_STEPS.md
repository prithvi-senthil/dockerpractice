# Google Login Complete Setup Guide - From Zero to Pro

**Complete step-by-step guide to understand and implement Google OAuth authentication.**
Even if you're new, by reading this you'll understand everything about Firebase, Google Cloud, and how Google login works!

---

# 📋 TABLE OF CONTENTS

1. [Part 1: Understand the Basics](#part-1-understand-the-basics)
2. [Part 2: What is Firebase?](#part-2-what-is-firebase)
3. [Part 3: What is Google Cloud Console?](#part-3-what-is-google-cloud-console)
4. [Part 4: How They Connect](#part-4-how-they-connect)
5. [Part 5: Step-by-Step Setup](#part-5-step-by-step-setup)
6. [Part 6: Testing](#part-6-testing)
7. [Troubleshooting](#troubleshooting)

---

# PART 1: UNDERSTAND THE BASICS

## What is Google Login?

**Simple Explanation:**
Instead of remembering passwords for every app, you use your Google account (Gmail) to login everywhere.

### How It Works (Simple Version)

```
┌─────────────────────────────────────────────────┐
│  You want to login to an app                    │
│                                                 │
│  App says: "Login with Google"                  │
│                                                 │
│  You click Google button                        │
│                                                 │
│  Google: "Hey! Pick your Gmail account"        │
│                                                 │
│  You pick: john@gmail.com                       │
│                                                 │
│  Google: "Is this really john@gmail.com?"      │
│  You: "Yes, here's my password"                │
│                                                 │
│  Google: "OK! I verified john@gmail.com"       │
│  App: "Welcome john!"                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Points

✅ **You only use 1 password** (your Google password)  
✅ **Google handles security** (you don't tell the app your password)  
✅ **App trusts Google** (if Google says you're real, you're real)  
✅ **Works everywhere** (all apps using Google login work same way)

---

## What You Need Before Starting

- ✅ Google account with Gmail
- ✅ Computer/laptop
- ✅ Internet connection
- ✅ Google Cloud Console access
- ✅ Firebase Console access
- ✅ Android app package name: `com.attendanceapp.tracker`
- ✅ SHA-1 fingerprint: `7A:E2:3D:07:88:DE:95:70:52:A5:AC:36:11:83:34:A0:66:6A:E2:A3`

---

# PART 2: WHAT IS FIREBASE?

## Understanding Firebase

**Firebase** is Google's service that manages app authentication and backend services.

Think of it like:

```
Your App
   ↓
Firebase (Middleman)
   ↓
Google's Servers
```

Firebase handles:

- ✅ Storing your app configuration
- ✅ Connecting to Google's OAuth system
- ✅ Managing user authentication
- ✅ Providing security certificates

### What Firebase Does for Google Login

1. **Creates a safe connection** between your app and Google
2. **Downloads security file** (google-services.json)
3. **Provides credentials** for your app to use

---

# PART 3: WHAT IS GOOGLE CLOUD CONSOLE?

## Understanding Google Cloud

**Google Cloud Console** is where you create OAuth credentials (permission slips).

Think of it like:

```
Company: Google
Department: Cloud Console
Team: OAuth Credentials

What they do:
- Create "permission slips" for apps to login with Google
- Track which apps are allowed
- Monitor app security
```

### What Google Cloud Does

1. **Creates OAuth credentials** (like a key to use Google auth)
2. **Registers your app** with Google
3. **Verifies your app is real** (using SHA-1 fingerprint)
4. **Allows your app to ask** "Is this person a real Google user?"

---

# PART 4: HOW THEY CONNECT

## Firebase + Google Cloud + Your App (Complete Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                        Google OAuth                         │
│                    (Master Service)                         │
└─────────────────────────────────────────────────────────────┘
        ↑                                       ↑
        │                                       │
        │ (Trusts credentials)              (Asks permission)
        │                                       │
┌───────┴──────────────┐            ┌──────────┴─────────────┐
│  Firebase Console    │            │ Google Cloud Console   │
│  (Certificate Mgmt)  │            │ (Credentials Mgmt)     │
├──────────────────────┤            ├────────────────────────┤
│ - google-services    │            │ - OAuth Client ID      │
│   .json              │            │ - Android Credential   │
│ - Project ID         │            │ - Web Credential       │
│ - API keys           │            │ - Fingerprints         │
└───────┬──────────────┘            └────────────┬───────────┘
        │                                        │
        │ (Provides security file)            (Provides keys)
        │                                        │
        └────────────────┬───────────────────────┘
                         │
                    ┌────▼──────┐
                    │  Your App  │
                    ├────────────┤
                    │ Frontend   │
                    │ + Backend  │
                    └────────────┘
```

### Simple Connection Flow

1. **For Setup**: You go to Firebase + Google Cloud, register your app
2. **Firebase downloads** `google-services.json` file
3. **Google Cloud creates** OAuth credentials
4. **You put both** in your app
5. **App uses them** to let users login with Google

---

# PART 5: STEP-BY-STEP SETUP

## Step 1️⃣: Create Firebase Project

**What you're doing**: Creating a space for your app in Firebase's system

### 1.1 Go to Firebase

1. Open: https://console.firebase.google.com/
2. Sign in with your Google account
3. Click **"Create a project"**

### 1.2 Enter Project Details

```
Project Name: BasicForm
Region: United States (or your region)
```

Leave other options as default. Click **"Create project"**

Wait 2-3 minutes ⏳

### 1.3 Add Your Android App

When project loads:

1. Click **"+Add app"** or find **Android icon**
2. Enter:
   - **Package Name**: `com.attendanceapp.tracker`
   - **App nickname**: `Attendance Tracker`
   - **SHA-1 Fingerprint**: `7A:E2:3D:07:88:DE:95:70:52:A5:AC:36:11:83:34:A0:66:6A:E2:A3`

3. Click **"Register app"**

### 1.4 Download google-services.json

1. After registration, click **"Download google-services.json"**
2. A file downloads
3. **Move it to**: `frontend/google-services.json` in your project folder
4. **Important**: Add to `.gitignore` (never push to GitHub)

**Verify**: Check that file exists at `frontend/google-services.json`

✅ **Firebase setup COMPLETE!**

---

## Step 2️⃣: Create Google Cloud Project

**What you're doing**: Creating OAuth credentials so your app can ask "Is this a real Google user?"

### 2.1 Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Sign in with Google account
3. Click **"Select a Project"** dropdown at top
4. Click **"New Project"**

### 2.2 Create Project

```
Project Name: Attendance App
(Leave other settings default)
```

Click **"Create"**

Wait 1-2 minutes ⏳

### 2.3 Enable APIs

Now you need to tell Google: "Hey, we want to use Google Sign-In"

1. In left menu, click **"APIs & Services"** → **"Library"**
2. Search: `Google Sign-In API`
3. Click it → Click **"Enable"**
4. Go back, search: `Google+ API`
5. Click it → Click **"Enable"**

✅ APIs are now enabled!

### 2.4 Create Web Credential

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Choose: **"Web application"**
4. **Name**: `Web Client`
5. Under **"Authorized JavaScript origins"** add:
   - `http://localhost:5000`
   - `http://192.168.1.100:5000` (your backend server IP)
   - `https://yourdomain.com` (production domain, if you have one)
6. Click **"Create"**

A popup shows your **Client ID**. Copy it! (starts with `800...`)

### 2.5 Create Android Credential

1. Click **"+ Create Credentials"** → **"OAuth 2.0 Client ID"** again
2. Choose: **"Android"**
3. **Package Name**: `com.attendanceapp.tracker`
4. **SHA-1 Fingerprint**: `7A:E2:3D:07:88:DE:95:70:52:A5:AC:36:11:83:34:A0:66:6A:E2:A3`
5. Click **"Create"**

Copy the **Client ID** shown

### 2.6 Create Web Offline Credential

1. Click **"+ Create Credentials"** → **"OAuth 2.0 Client ID"** again
2. Choose: **"Web application"**
3. **Name**: `Web Client for Offline Access`
4. **Authorized origins**:
   - `http://localhost:3000`
   - `https://yourdomain.com`
5. Click **"Create"**

Copy this **Client ID** too

✅ **You now have 3 OAuth credentials:**

- Web Client (for web)
- Android Client (for your app)
- Web Offline Client (for backend)

---

## Step 3️⃣: What Your Credentials Look Like

**Save these somewhere safe!**

```
Google Project ID:
800231155792

Client ID (Android):
800231155792-ahm9cf1p82ho2sn0irlkr7u72pb6n149.apps.googleusercontent.com

Client ID (Web):
800231155792-ahm9cf1p82ho2sn0irlkr7u72pb6n149.apps.googleusercontent.com

Client ID (Offline):
800231155792-ahm9cf1p82ho2sn0irlkr7u72pb6n149.apps.googleusercontent.com

Package Name:
com.attendanceapp.tracker

SHA-1 Fingerprint:
7A:E2:3D:07:88:DE:95:70:52:A5:AC:36:11:83:34:A0:66:6A:E2:A3

Firebase Project:
basicform-a45fe
```

---

## Step 4️⃣: Add Credentials to Your App

Now put these credentials in your code!

### 4.1 Update `frontend/app.json`

```json
{
  "expo": {
    "name": "Attendance Tracker",
    "slug": "frontend",
    "version": "1.0.0",
    "assetBundlePatterns": ["**/*"],
    "plugins": [
      "@react-native-firebase/app",
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUniqueIdentifier": "com.attendanceapp.tracker"
        }
      ]
    ],
    "android": {
      "package": "com.attendanceapp.tracker",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### 4.2 Update `backend/.env`

```env
PORT=5000
JWT_SECRET=your_super_secret_key_here_min_32_chars
GOOGLE_CLIENT_ID=800231155792-ahm9cf1p82ho2sn0irlkr7u72pb6n149.apps.googleusercontent.com
DATABASE_URL=mysql://user:password@localhost:3306/attendance_db
NODE_ENV=development
```

### 4.3 Configure LoginScreen.js

In `frontend/src/screens/auth/LoginScreen.js`:

```javascript
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

// At the top of your component
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

### 4.4 Create Backend Endpoint

In `backend/controllers/authController.js`:

```javascript
const jwt = require("jsonwebtoken");
const db = require("../config/db");

exports.googleLogin = async (req, res) => {
  try {
    const { email, serverAuthCode } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log("🔐 Google login for:", email);

    // Check if user exists in database
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
      [email],
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: "User not registered in system",
      });
    }

    const user = users[0];

    // Generate JWT token
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
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Login failed" });
  }
};
```

In `backend/routes/authRoutes.js`:

```javascript
const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();

router.post("/google-login", authController.googleLogin);

module.exports = router;
```

### 4.5 Create Database Table

Run in MySQL:

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  user_type ENUM('student', 'faculty', 'hod', 'admin') NOT NULL DEFAULT 'student',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Test user
INSERT INTO users (name, email, user_type, is_active)
VALUES ('Test User', 'test@gmail.com', 'student', TRUE);
```

✅ **All configuration done!**

---

# PART 6: TESTING

## Test 1: Emulator Test

```bash
cd frontend
npx eas build --platform android --profile development
```

1. Build finishes
2. Install APK on emulator
3. Open app
4. Tap "Continue with Google"
5. Select test email from database
6. Should see "Welcome" screen ✅

## Test 2: Real Phone Test

Same as above, but on physical Android phone

## Test 3: Error Test

1. Try logging in with email NOT in database
2. Should see: "User not registered in system"
3. Add that email to database
4. Try again ✅

---

# TROUBLESHOOTING

| Problem                          | Solution                                                |
| -------------------------------- | ------------------------------------------------------- |
| "google-services.json not found" | Download again, place in frontend/                      |
| "Invalid Client ID"              | Copy from Google Cloud Console again                    |
| "SHA-1 mismatch"                 | Get correct SHA-1: `eas credentials --platform android` |
| "User not registered"            | Add email to MySQL users table                          |
| "Firebase not initializing"      | Check app.json plugins list                             |
| "API not enabled"                | Go to Google Cloud → APIs & enable Sign-In API          |
| "App not recognized"             | Verify package name matches Google Cloud                |

---

# 🎓 SUMMARY - You Now Understand:

✅ What Google login is  
✅ What Firebase does (security certificates)  
✅ What Google Cloud does (OAuth credentials)  
✅ How they connect together  
✅ Step-by-step setup from zero  
✅ How to test it  
✅ How to fix problems

**You're now a pro at Google OAuth setup!** 🚀

---

**Last Updated**: April 18, 2026  
**Status**: Complete Setup Guide  
**Level**: Beginner to Pro
