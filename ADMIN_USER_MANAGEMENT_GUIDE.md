# Admin User Management System Guide

## Overview

The Admin User Management system allows administrators to:

- ✅ Create, edit, and delete HODs (Heads of Department)
- ✅ Create, edit, and delete Faculty members
- ✅ Create, edit, and delete Students
- ✅ Send automated welcome emails with login credentials
- ✅ Track all user management actions in audit logs
- ✅ View user summary by role

---

## API Endpoints

### **HOD Management** (`/api/admin/hods`)

#### Create HOD

```http
POST /api/admin/hods
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "Dr. Rajesh Kumar",
  "email": "rajesh@college.edu",
  "department": "Computer Science"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "HOD created successfully",
  "hod": {
    "id": 10,
    "name": "Dr. Rajesh Kumar",
    "email": "rajesh@college.edu",
    "department": "Computer Science",
    "user_type": "hod"
  },
  "email_sent": true
}
```

#### Get All HODs

```http
GET /api/admin/hods
Authorization: Bearer {admin_token}
```

**Response:**

```json
{
  "success": true,
  "count": 2,
  "hods": [
    {
      "id": 10,
      "name": "Dr. Rajesh Kumar",
      "email": "rajesh@college.edu",
      "department": "Computer Science",
      "is_active": 1,
      "created_at": "2026-04-16 10:30:00"
    }
  ]
}
```

#### Update HOD

```http
PATCH /api/admin/hods/:id
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "Dr. Rajesh Kumar Updated",
  "department": "Computer Science & Engineering",
  "is_active": 1
}
```

#### Delete HOD

```http
DELETE /api/admin/hods/:id
Authorization: Bearer {admin_token}
```

---

### **Faculty Management** (`/api/admin/faculty`)

#### Create Faculty (assign to HOD)

```http
POST /api/admin/faculty
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "Prof. Priya Sharma",
  "email": "priya@college.edu",
  "report_to": 10
}
```

**Note:** `report_to` is the HOD's ID. Faculty will automatically be assigned to HOD's department.

**Response:**

```json
{
  "success": true,
  "message": "Faculty created successfully",
  "faculty": {
    "id": 11,
    "name": "Prof. Priya Sharma",
    "email": "priya@college.edu",
    "department": "Computer Science",
    "report_to": 10,
    "user_type": "faculty"
  },
  "email_sent": true
}
```

#### Get All Faculty

```http
GET /api/admin/faculty
Authorization: Bearer {admin_token}
```

**Response includes HOD name for each faculty:**

```json
{
  "success": true,
  "count": 3,
  "faculty": [
    {
      "id": 11,
      "name": "Prof. Priya Sharma",
      "email": "priya@college.edu",
      "department": "Computer Science",
      "report_to": 10,
      "hod_name": "Dr. Rajesh Kumar",
      "is_active": 1
    }
  ]
}
```

#### Update Faculty

```http
PATCH /api/admin/faculty/:id
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "Prof. Priya Sharma Updated",
  "report_to": 10,
  "is_active": 1
}
```

#### Delete Faculty

```http
DELETE /api/admin/faculty/:id
Authorization: Bearer {admin_token}
```

---

### **Student Management** (`/api/admin/students`)

#### Create Student

```http
POST /api/admin/students
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "Rahul Verma",
  "email": "rahul@student.edu"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Student created successfully",
  "student": {
    "id": 15,
    "name": "Rahul Verma",
    "email": "rahul@student.edu",
    "user_type": "student"
  },
  "email_sent": true
}
```

#### Get All Students

```http
GET /api/admin/students
Authorization: Bearer {admin_token}
```

#### Update Student

```http
PATCH /api/admin/students/:id
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "Rahul Verma Updated",
  "is_active": 1
}
```

#### Delete Student

```http
DELETE /api/admin/students/:id
Authorization: Bearer {admin_token}
```

---

### **Admin Dashboard**

#### Get All Users by Role

```http
GET /api/admin/users
Authorization: Bearer {admin_token}
```

**Response:**

```json
{
  "success": true,
  "summary": {
    "total_hods": 2,
    "total_faculty": 5,
    "total_students": 50
  },
  "users_by_role": {
    "hod": {
      "count": 2,
      "users": [
        {
          "id": 10,
          "name": "Dr. Rajesh Kumar",
          "email": "rajesh@college.edu",
          "department": "Computer Science",
          "is_active": 1,
          "created_at": "2026-04-16 10:30:00"
        }
      ]
    },
    "faculty": {
      "count": 5,
      "users": [...]
    },
    "student": {
      "count": 50,
      "users": [...]
    }
  }
}
```

---

## Features

### 1. **Email Notifications**

- ✅ HOD welcome email with credentials and department info
- ✅ Faculty welcome email with HOD name
- ✅ Student welcome email with system info
- ✅ Password reset email with secure token

### 2. **Audit Logging**

All user management actions are logged:

- CREATE USER
- UPDATE USER
- DELETE USER

Example audit log entry:

```sql
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
VALUES (1, 'CREATE', 'USER', 10, 'Created HOD: Dr. Rajesh Kumar (Computer Science)');
```

### 3. **Auto-generated Passwords**

- 12-character passwords with mix of letters, numbers, symbols
- Sent via email to new users
- Users must change password on first login

### 4. **Department Isolation**

- Faculty automatically assigned to HOD's department
- HOD can only see their own department's faculty
- Course assignments respect department boundaries

---

## Frontend Integration

### Admin Panel Structure

```
ADMIN DASHBOARD
├── Users Management
│   ├── HODs Tab
│   │   ├── [Add HOD Form]
│   │   │   ├── Name (text input)
│   │   │   ├── Email (email input)
│   │   │   └── Department (dropdown/select)
│   │   └── [HOD List Table]
│   │       ├── Name | Email | Department | Status | Actions
│   │       └── Edit | Delete | Deactivate buttons
│   │
│   ├── Faculty Tab
│   │   ├── [Add Faculty Form]
│   │   │   ├── Name (text input)
│   │   │   ├── Email (email input)
│   │   │   └── Report To (HOD dropdown)
│   │   └── [Faculty List Table]
│   │       ├── Name | Email | HOD | Department | Status | Actions
│   │       └── Edit | Delete | Deactivate buttons
│   │
│   └── Students Tab
│       ├── [Add Student Form]
│       │   ├── Name (text input)
│       │   └── Email (email input)
│       └── [Student List Table]
│           ├── Name | Email | Status | Created Date | Actions
│           └── Edit | Delete | Deactivate buttons
│
├── Dashboard Stats
│   ├── Total HODs: 2
│   ├── Total Faculty: 5
│   └── Total Students: 50
│
└── Audit Logs (Recent actions)
```

---

## Workflow Examples

### Example 1: Create HOD with Faculty

```
1. Admin opens Admin Panel
2. Clicks "Users" → "HODs" tab
3. Fills form:
   - Name: Dr. Rajesh Kumar
   - Email: rajesh@college.edu
   - Department: Computer Science
4. Clicks "Create HOD"
5. ✅ HOD created
6. 📧 Welcome email sent with password

7. Clicks "Faculty" tab
8. Fills form:
   - Name: Prof. Priya Sharma
   - Email: priya@college.edu
   - Report To: Dr. Rajesh Kumar (dropdown)
9. Clicks "Create Faculty"
10. ✅ Faculty created under HOD
11. 📧 Welcome email sent
12. Department automatically set to "Computer Science"
```

### Example 2: Update Faculty HOD Assignment

```
1. Admin opens Faculty tab
2. Finds "Prof. Priya Sharma"
3. Clicks "Edit"
4. Changes "Report To" from "Dr. Rajesh Kumar" to "Dr. Arun Patel"
5. Clicks "Save"
6. ✅ Faculty reassigned
7. 📝 Action logged in audit logs
```

### Example 3: Deactivate Student

```
1. Admin opens Students tab
2. Finds "Rahul Verma"
3. Clicks "Edit" or toggles "Active" switch
4. Sets is_active = 0
5. Clicks "Save"
6. ✅ Student deactivated (can't login)
7. 📝 Action logged
```

---

## Security & Best Practices

### Password Management

- ✅ Auto-generated 12-char passwords with special chars
- ✅ Passwords hashed with bcryptjs (salt rounds: 10)
- ✅ Never exposed in API responses (only via email)
- ✅ Users must change on first login

### Email Configuration

**Environment variables needed in `.env`:**

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:3000
```

**For Gmail:**

1. Enable 2-Factor Authentication
2. Generate App Password (not your regular password)
3. Use App Password in `EMAIL_PASSWORD`

**For other providers:**

- Update `EMAIL_SERVICE` in emailService.js
- Configure with your SMTP credentials

### Access Control

- ✅ Only admins can access user management endpoints
- ✅ All routes protected with `auth` middleware
- ✅ Role verification on all endpoints

### Data Validation

- ✅ Email uniqueness checked before creation
- ✅ HOD existence verified before assigning faculty
- ✅ Required fields validated (name, email, department)

---

## Troubleshooting

### Email Not Sending

**Problem:** `Email failed: getaddrinfo ENOTFOUND...`

**Solution:**

1. Check `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD` in `.env`
2. For Gmail, use App Password (not regular password)
3. Enable "Less secure app access" if not using App Password

### Duplicate Email Error

**Problem:** `ERROR 1054: Email already exists`

**Solution:**

1. Use different email for new user
2. Or delete existing user first if no longer needed

### Faculty Not Appearing Under HOD

**Problem:** Faculty created but not in HOD's faculty list

**Solution:**

1. Verify `report_to` field is set correctly to HOD's ID
2. Check faculty's `department` matches HOD's department

### Password Reset Not Working

**Problem:** Users can't reset password

**Solution:**

1. Implement forgot-password endpoint (coming soon)
2. Send password reset email with secure token
3. Validate token before allowing new password

---

## Future Enhancements

- [ ] Bulk user import (CSV/Excel)
- [ ] Password reset functionality
- [ ] User search/filter by name, email, department
- [ ] Role-based dashboard (different views for HOD, Faculty)
- [ ] Activity logs export (PDF/CSV)
- [ ] Two-factor authentication (2FA)
- [ ] SMS notifications alongside email
- [ ] User inactivity auto-deactivation

---

## Testing Checklist

- [ ] Create HOD - verify email sent
- [ ] Edit HOD - verify changes saved
- [ ] Delete HOD - verify user removed
- [ ] Create Faculty - verify assigned to HOD
- [ ] Edit Faculty - verify HOD reassignment works
- [ ] Delete Faculty - verify removed
- [ ] Create Student - verify email sent
- [ ] Edit Student - verify name/status updated
- [ ] Delete Student - verify removed
- [ ] Check audit logs - verify all actions logged
- [ ] Test with invalid data - verify error messages
- [ ] Test access control - verify non-admin blocked

---

**Document Version:** 1.0  
**Last Updated:** April 16, 2026  
**Administrator:** Development Team
