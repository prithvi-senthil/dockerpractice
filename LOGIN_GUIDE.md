# Login Instructions by Role

## Overview

The attendance app supports four distinct roles with different capabilities. Each role has specific login credentials and permissions. This guide explains how to log in for each role and what you can do.

---

## 1. **ADMIN** Login

### Purpose

- Global course approval and management authority
- View all courses across all departments
- Approve/reject courses created by HODs
- Manage all users and systems
- Access complete audit logs
- View system-wide statistics

### Login Credentials

```
Email: admin@college.edu
Password: admin@123
```

### What Admins Can Do

- ✅ View ALL courses (across all departments)
- ✅ Approve courses (makes them visible to students)
- ✅ Reject courses (returns to HOD for revision)
- ✅ Create courses directly
- ✅ Assign students to any course
- ✅ View complete system audit logs
- ✅ View comprehensive statistics and dashboard
- ✅ Manage faculty and HOD assignments
- ✏️ Cannot: Mark attendance or request leaves

### Admin Dashboard Features

- Course approval workflow (PENDING → APPROVED)
- All departments at a glance
- HOD performance metrics
- Faculty and student counts
- System activity audit trail

---

## 2. **HOD** (Head of Department) Login

### Purpose

- Department-level authority and management
- Create courses within their department
- Assign faculty to courses
- Approve/reject faculty leave requests
- View department statistics
- Manage their team

### Login Credentials

```
Email: hod1@college.edu        (For CSE Department)
Password: hod@123

OR

Email: hod2@college.edu        (For ECE Department)
Password: hod@123
```

### Data Isolation Guarantee

- 🔒 **HOD1 ONLY sees CSE department data**
- 🔒 **HOD2 ONLY sees ECE department data**
- 🔒 **HOD1 cannot see HOD2's data and vice versa**
- ✅ **Admin can see all department data**

### What HODs Can Do

- ✅ Create courses in their department (PENDING approval from admin)
- ✅ Assign faculty to courses (from their department only)
- ✅ View their faculty members list
- ✅ View their faculty's leave requests
- ✅ Approve/reject faculty leave requests
- ✅ View department-specific statistics
- ✅ View their own action audit logs
- ❌ Cannot: See other HOD's department data
- ❌ Cannot: Approve their own courses (Admin approval required)
- ❌ Cannot: Create students or assign students directly

### HOD Course Workflow

1. HOD1 logs in, creates a "Database Fundamentals" course
   - Status: **PENDING** (awaiting admin approval)
   - Course is NOT visible to students yet
2. Admin logs in, sees the PENDING course, clicks "Approve"
   - Status: **APPROVED**
   - Course NOW visible to students
3. INDEPENDENT: HOD2 creates "Embedded Systems" course (same workflow)
   - HOD1 and HOD2 **cannot see each other's courses**
   - Both report to Admin for approval

---

## 3. **FACULTY** (Teacher) Login

### Purpose

- Facilitate course delivery
- Create and manage activities
- Monitor student attendance
- Participate in leave management

### Login Credentials

```
Email: faculty1@college.edu
Password: faculty@123

OR

Email: faculty2@college.edu
Password: faculty@123
```

### What Faculty Can Do

- ✅ Create activities within their assigned courses
- ✅ Start/end attendance sessions with OTP
- ✅ View student attendance in their courses
- ✅ Request leave (submitted for HOD approval)
- ✅ View their own leave status
- ✅ View activity attendance details
- ❌ Cannot: Approve courses
- ❌ Cannot: Approve leaves (HOD does this)
- ❌ Cannot: Create courses directly
- ❌ Cannot: Manage other faculty members

### Faculty Attendance Workflow

1. Faculty arrives for class, creates attendance activity
2. Generates OTP for students (e.g., "5432")
3. Students enter OTP to mark attendance in real-time
4. Faculty ends attendance session after class
5. System calculates attendance percentage automatically

---

## 4. **STUDENT** Login

### Purpose

- Mark attendance with OTP
- View personal attendance records and percentage
- Request leave when absent

### Login Credentials

```
Email: student1@college.edu
Password: student@123

OR

Email: student2@college.edu
Password: student@123
```

### Permission Lock-Down (Students Can ONLY Do)

- ✅ Mark attendance (using OTP provided by faculty)
- ✅ View their own attendance records
- ✅ Check their attendance percentage
- ✅ Request leave
- ✅ View their own leave requests
- ✅ Check their leave approval status
- ❌ Cannot: Create courses
- ❌ Cannot: Create activities
- ❌ Cannot: Approve anything
- ❌ Cannot: View other students' data
- ❌ Cannot: Manage any system settings

### Student Attendance Process

1. Faculty creates attendance activity and generates OTP
2. Student logs in to app
3. Clicks "Mark Attendance"
4. Enters OTP (e.g., "5432")
5. System marks attendance start time
6. At end of session, student taps "Mark End"
7. System tracks: present/absent/leave status

### Student Leave Request Process

1. Student logs in
2. Clicks "Request Leave"
3. Selects dates and reason
4. Submits request (Status: PENDING)
5. HOD receives notification
6. HOD approves/rejects
7. Student can view approval status

---

## Login Screen Flow

```
1. Open App
2. If Not Logged In → See Login Screen
3. Enter Email Address
4. Enter Password
5. Tap "Login"
6. System validates credentials
7. Role determined from user_type in database
8. User redirected to appropriate dashboard
```

---

## Complete Role Access Matrix

| Action               | Admin | HOD    | Faculty  | Student    |
| -------------------- | ----- | ------ | -------- | ---------- |
| **View All Courses** | ✅    | ❌     | ❌       | ❌         |
| **Create Course**    | ✅    | ✅\*   | ❌       | ❌         |
| **Approve Course**   | ✅    | ❌     | ❌       | ❌         |
| **Assign Faculty**   | ✅    | ✅\*\* | ❌       | ❌         |
| **Create Activity**  | ❌    | ❌     | ✅       | ❌         |
| **Mark Attendance**  | ❌    | ❌     | ✅\*\*\* | ✅\*\*\*\* |
| **Request Leave**    | ❌    | ❌     | ✅       | ✅         |
| **Approve Leave**    | ✅    | ✅     | ❌       | ❌         |
| **View Audit Logs**  | ✅    | ✅     | ❌       | ❌         |

**Legend:**

- `✅` = Can perform action
- `✅*` = Can create, needs admin approval
- `✅**` = Only from their department
- `✅***` = Generates OTP
- `✅****` = Using OTP from faculty
- `❌` = Cannot perform action

---

## Common Login Scenarios

### Scenario 1: Course Creation & Approval Workflow

```
1. HOD1 logs in
2. Creates "Python Programming" course (Status: PENDING)
3. HOD1 logs out

4. Admin logs in
5. Views all PENDING courses
6. Clicks "Approve" for "Python Programming"
7. Course now APPROVED and visible to students
8. Admin logs out

9. Students log in
10. See "Python Programming" in available courses
11. Enroll and start attending
```

### Scenario 2: Attendance Marking with OTP

```
1. Faculty logs in
2. Selects course and starts attendance
3. System generates OTP: "7291"
4. Faculty displays OTP on board/screen

5. Student logs in
6. Selects "Python Programming"
7. Clicks "Mark Attendance"
8. Enters OTP: "7291"
9. System marks: Attendance Started at 10:05 AM
10. Class ends, faculty clicks "End Session"

11. Student clicks "Mark Attendance End"
12. System records: Attendance Ended at 11:05 AM
13. Marks student as PRESENT
```

### Scenario 3: Leave Request & Approval

```
1. Faculty logs in
2. Requests leave for next Monday and Tuesday
3. Reason: "Medical appointment"
4. Status: PENDING (waiting for HOD approval)
5. Faculty logs out

6. HOD logs in
7. Views pending leave requests from their faculty
8. Reviews faculty's attendance (< 95% required)
9. Approves the leave request
10. Faculty notified of approval
11. Faculty's attendance calculation excludes leave days
```

---

## Database Credentials (Development Reference)

To add new test users or manage the database directly:

```sql
-- View all users and their roles
SELECT email, password, user_type, report_to FROM users;

-- Add new student
INSERT INTO users (email, password, user_type, name)
VALUES ('newstudent@college.edu', 'password@123', 'student', 'New Student');

-- Add faculty under HOD1
INSERT INTO users (email, password, user_type, name, report_to)
VALUES ('newfaculty@college.edu', 'password@123', 'faculty', 'New Faculty', 1);

-- View audit logs
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20;
```

---

## Troubleshooting

### "Invalid Credentials"

- Verify email and password match the table above
- Check caps lock is off
- Email must be exact (e.g., `admin@college.edu`)

### "Access Denied"

- Confirm you're using the correct role's login credentials
- This operation may not be available for your role
- Contact admin if you need more permissions

### "Course Not Found"

- HOD: Course only visible if it's in your department
- Student: Course only visible if it's APPROVED by admin
- Ask HOD or admin to check course approval status

### "No Faculty to Assign"

- HOD: Can only assign faculty from their own department
- Verify faculty has `report_to = your_hod_id`

---

## Security Notes

- ✅ Each HOD's data is isolated at the database level
- ✅ Students can only view their own records
- ✅ All admin actions are logged in audit_logs table
- ✅ Passwords should be strong (currently simplified for testing)
- ✅ OTP expires after 15 minutes
- ✅ JWT tokens expire after 24 hours

---

## Next Steps

**For Development/Testing:**

1. Use credentials above to log in as each role
2. Test the course approval workflow
3. Verify HOD data isolation (HOD1 cannot see HOD2's data)
4. Test student attendance marking with OTP
5. Check audit logs for all sensitive actions

**For Production:**

1. Replace hardcoded passwords with secure generated passwords
2. Implement email verification for new users
3. Add two-factor authentication for admin accounts
4. Enable HTTPS for all API communications
5. Set up automated backups of audit logs
6. Establish access control policies

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Role System:** Complete RBAC with Department Isolation
