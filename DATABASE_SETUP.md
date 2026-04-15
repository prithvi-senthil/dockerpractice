# Database Setup Guide

## ⚠️ IMPORTANT: Admin Login Fix

The admin login issue has been fixed permanently by regenerating all bcrypt password hashes.

### What Was Wrong?

All test users in the database had the same invalid bcrypt hash. This prevented login from working properly, especially for the admin account.

### What's Fixed?

✅ All password hashes in `database/schema.sql` have been regenerated with proper bcrypt (cost factor 10)
✅ Valid test credentials are now available
✅ Hash generation utility script provided for future use

## Setup Instructions

### 1️⃣ Reset Database with New Schema

If you already have the database created, drop it and recreate:

```bash
# Option A: Using MySQL CLI
mysql -u shanthosh -pworkbench123 < database/schema.sql

# Option B: Using MySQL Workbench
# Open database/schema.sql → Execute → Apply
```

### 2️⃣ Verify Test Credentials

Use these credentials to login (see `TEST_CREDENTIALS.md` for full list):

**Admin Account:**

- Email: `admin@college.edu`
- Password: `admin123`

**Faculty Account:**

- Email: `test-faculty@college.edu`
- Password: `faculty123`

**Student Account:**

- Email: `test-student@college.edu`
- Password: `student123`

### 3️⃣ Verify Backend Server

Ensure backend is running:

```bash
cd backend
npm install
npm start
```

You should see:

```
✅ Server running on port 5000
✅ Database connected successfully
```

### 4️⃣ Test Login

Try logging in with admin@college.edu / 123. If successful, you'll get:

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@college.edu",
    "user_type": "admin"
  }
}
```

## 🛠️ Regenerating Hashes (Optional)

If you need to generate new bcrypt hashes for any reason:

```bash
cd backend
node generateHashes.js
```

This will output hashes you can use in `database/schema.sql`.

## ✅ Troubleshooting

| Issue                       | Solution                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| "Invalid credentials" error | Verify password is correct (case-sensitive). Check hash in database. |
| "User not found" error      | Ensure schema.sql was executed on your MySQL database.               |
| bcrypt module error         | Run `npm install` in backend directory.                              |
| Database connection failed  | Check DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD in `.env`      |

## 📝 Production Notes

⚠️ **DO NOT** use these test credentials in production!

For production:

1. Use strong, unique passwords
2. Generate new bcrypt hashes: `node generateHashes.js`
3. Store passwords securely (use environment variables)
4. Use HTTPS for all authentication
5. Implement rate limiting on login endpoint
6. Log all authentication attempts

---

**Last Updated:** April 15, 2026
**Status:** ✅ All authentication hashes fixed and verified
