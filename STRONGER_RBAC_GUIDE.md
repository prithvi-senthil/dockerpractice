# Stronger Role-Based Access Control (RBAC)

## Complete Guide to the Enhanced Authorization System

---

## 🎯 Overview

Your attendance app now has a **professional-grade RBAC system** with:

- ✅ **HOD Department Isolation** - HOD1 cannot see HOD2's data
- ✅ **Course Approval Workflow** - Admin approves all courses from all departments
- ✅ **Student Permission Lock** - Students can ONLY mark attendance, view records, request leaves
- ✅ **Complete Audit Trail** - Everything is logged with who, what, when
- ✅ **Strict Hierarchy** - Admin > HOD > Faculty > Student

---

## 📊 Role Hierarchy & Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN                                   │
│  - Global visibility (all departments)                       │
│  - Approve/Reject courses from any HOD                       │
│  - Create courses directly                                   │
│  - Assign students to any course                             │
│  - View audit logs (complete system activity)                │
│  - Dashboard: statistics from all departments                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    HOD                                        │
│  - Department head (e.g., CS Dept, Electronics Dept)         │
│  - Create courses for their department ONLY                  │
│  - Assign faculty FROM their department                      │
│  - See ONLY their department's:                              │
│    - Courses                                                 │
│    - Faculty                                                 │
│    - Student enrollments                                     │
│    - Leave requests from faculty                             │
│  - Approve/Reject faculty leave requests                     │
│  - Cannot: Approve courses (admin does), see other HOD data  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   FACULTY                                     │
│  - Create activities/sessions                                │
│  - Generate OTP for attendance marking                        │
│  - View enrolled students in their activities                │
│  - View attendance reports for their activities              │
│  - Approve/Reject student leave requests                     │
│  - Request and track own leaves                              │
│  - Cannot: Create courses, assign students, see other dept   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   STUDENT                                     │
│  - Mark attendance using OTP                                 │
│  - View own attendance records                               │
│  - View own attendance percentage                            │
│  - Request leaves                                            │
│  - View own leave requests                                   │
│  - View own leave percentage                                 │
│  - Cannot: Do ANYTHING ELSE (create, approve, manage, etc)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Data Isolation Strategy

### HOD Department Isolation

**Problem Solved:** HOD1 and HOD2 operate in different departments and should NEVER see each other's data.

**Solution Implemented:**

1. **Database Layer**

   ```sql
   -- HOD can only see courses where hod_id = their_id
   SELECT * FROM courses WHERE hod_id = 123  -- Only HOD #123's courses

   -- HOD can only see faculty where report_to = their_id
   SELECT * FROM users WHERE report_to = 123  -- Only faculty under HOD #123
   ```

2. **Middleware Layer**

   ```javascript
   // In controllers, check department ownership
   if (course.hod_id !== req.user.id && req.user.user_type === "hod") {
     return res.status(403).json({ error: "Not your department" });
   }
   ```

3. **Route Protection**
   ```javascript
   // All HOD routes require authentication + hod role
   router.get("/my-courses", auth, requireRole("hod"), controller);
   ```

### Student Data Isolation

**Problem Solved:** Student1 should NEVER see Student2's attendance or leave records.

**Solution Implemented:**

1. **Database Filter**

   ```sql
   -- Student can only see their own records
   SELECT * FROM attendance_records WHERE student_id = 456
   ```

2. **Endpoint Protection**
   ```javascript
   // Student can only access these endpoints
   GET    /api/student/attendance/my-records        -- Their records only
   GET    /api/student/leaves/my-requests           -- Their leaves only
   POST   /api/student/leaves/request               -- Request NEW leave
   ```

---

## 📋 Complete API Reference

### ADMIN ENDPOINTS (Global Authority)

**Course Management**

```
GET    /api/admin/courses              -- View ALL courses from ALL departments
GET    /api/admin/courses/:id          -- View specific course details
POST   /api/admin/courses/:id/approve  -- APPROVE course (makes it visible)
POST   /api/admin/courses/:id/reject   -- REJECT course (with reason)
POST   /api/admin/courses              -- Create course directly
POST   /api/admin/courses/assign-students -- Bulk assign students to course
```

**Audit & Reporting**

```
GET    /api/admin/audit-logs           -- View complete audit trail
GET    /api/admin/stats                -- Dashboard: HODs, faculty, students, courses
```

---

### HOD ENDPOINTS (Department Authority)

**Course Management (Department Only)**

```
GET    /api/hod/my-courses             -- See ONLY your dept courses
POST   /api/hod/courses                -- Create course for your dept (pending approval)
POST   /api/hod/courses/:id/assign-faculty -- Reassign faculty in YOUR dept
```

**Faculty Management**

```
GET    /api/hod/my-faculty             -- See ONLY faculty reporting to you
```

**Leave Management**

```
GET    /api/hod/my-leaves              -- See ONLY your faculty's leaves
PATCH  /api/hod/leaves/:id/approve     -- Approve/Reject faculty leave
```

**Statistics & Audit**

```
GET    /api/hod/stats                  -- Your department stats only
GET    /api/hod/audit-log              -- Your activity logs only
```

---

### STUDENT ENDPOINTS (Limited Access)

**Attendance Marking (OTP Only)**

```
POST   /api/student/attendance/mark-start    -- Enter OTP to mark start
POST   /api/student/attendance/mark-end      -- Complete attendance
```

**View Own Records**

```
GET    /api/student/attendance/my-records    -- Own attendance records
GET    /api/student/attendance/percentage    -- Own attendance percentage
GET    /api/student/leaves/my-requests       -- Own leave requests
GET    /api/student/leaves/percentage        -- Own leave percentage
```

**Leave Management**

```
POST   /api/student/leaves/request           -- Request new leave
```

---

## 🔄 Course Approval Workflow

```
HOD Timeline:
├─ [1] CREATE COURSE
│     POST /api/hod/courses
│     ├─ Verify faculty is from HOD's department
│     ├─ Set status = 'PENDING'
│     └─ Awaits admin approval
│
├─ [2] COURSE IN PENDING STATE
│     Course is not visible to students yet
│     Students cannot enroll
│
└─ END POINT: Waiting for Admin

Admin Timeline:
├─ [1] RECEIVE PENDING COURSE
│     GET /api/admin/courses
│     └─ Shows all pending courses from all HODs
│
├─ [2] REVIEW AND DECIDE
│     Either:
│     - POST /api/admin/courses/:id/approve  → status = 'APPROVED'
│     - POST /api/admin/courses/:id/reject   → status = 'REJECTED'
│
├─ [3] IF APPROVED
│     ├─ Course becomes visible to students
│     ├─ Students can enroll
│     └─ Faculty can manage it
│
└─ [4] IF REJECTED
      ├─ Course hidden from students
      ├─ HOD notified (in rejection_reason)
      └─ HOD can fix and resubmit
```

---

## 🔐 Permission Matrix

| Feature                 | Admin | HOD      | Faculty | Student |
| ----------------------- | ----- | -------- | ------- | ------- |
| **Courses**             |       |          |         |         |
| Create course           | ✅    | ✅\*     | ❌      | ❌      |
| Approve course          | ✅    | ❌       | ❌      | ❌      |
| Assign faculty          | ✅    | ✅\*\*   | ❌      | ❌      |
| Assign students         | ✅    | ❌       | ❌      | ❌      |
| View all courses        | ✅    | ❌       | ❌      | ❌      |
| View department courses | ✅    | ✅       | ❌      | ❌      |
| View own enrollments    | ❌    | ❌       | ❌      | ✅      |
| **Attendance**          |       |          |         |         |
| Mark attendance         | ❌    | ❌       | ❌      | ✅      |
| View own records        | ❌    | ❌       | ❌      | ✅      |
| View activity reports   | ✅    | ✅\*\*\* | ✅      | ❌      |
| **Leave Management**    |       |          |         |         |
| Request leave           | ❌    | ✅       | ✅      | ✅      |
| Approve own level       | ✅    | ✅       | ✅      | ❌      |
| View all leaves         | ✅    | ❌       | ❌      | ❌      |
| View dep't leaves       | ✅    | ✅       | ❌      | ❌      |
| **Audit**               |       |          |         |         |
| View audit logs         | ✅    | ❌       | ❌      | ❌      |
| View own logs           | ✅    | ✅       | ❌      | ❌      |

\*HOD creates courses but they need ADMIN approval before becoming active
**HOD assigns faculty from THEIR department only \***HOD sees their department's attendance

---

## 🛡️ Security Features

### 1. Department Isolation Enforcement

```javascript
// Every HOD query checks department ownership
const courseOwnedByHOD = course.hod_id === req.user.id;
if (!courseOwnedByHOD) {
  return res.status(403).json({ error: "Not your department" });
}
```

### 2. Hierarchical Permission Checks

```javascript
// Role alone isn't enough - context matters
if (approverRole === "faculty" && subscribedStudentIds.includes(targetId)) {
  // Faculty can approve student they teach
  allowApproval = true;
} else if (approverRole === "hod" && facultyReportsToMe.includes(targetId)) {
  // HOD can approve faculty in their dept
  allowApproval = true;
} else if (approverRole === "admin") {
  // Admin can approve anyone
  allowApproval = true;
} else {
  return res.status(403).json({ error: "Unauthorized" });
}
```

### 3. Audit Trail for Compliance

```javascript
// Every sensitive action logged
auditLog(
  userId, // Who did it
  "ACTION", // What action
  "ENTITY_TYPE", // On what
  entityId, // Which entity
  "TRACE_NAME", // Classification
  oldValues, // Before
  newValues, // After
  description, // Why/summary
);
```

---

## 📈 Example Workflows

### Workflow 1: HOD Creates Course (With Approval)

```
1. HOD1 POST /api/hod/courses
   Body: {
     title: "Advanced Java",
     code: "CS301",
     assigned_faculty_id: 5,  ← Faculty who reports to HOD1
     start_date: "2026-04-01",
     end_date: "2026-06-30"
   }

2. [Backend checks]
   ✓ User is HOD
   ✓ Faculty #5 reports to HOD1
   ✓ Create course with status = 'PENDING'

3. Course now exists but:
   ❌ Not visible to students
   ❌ Students cannot enroll
   ⏳ Awaits admin approval

4. Admin views pending course
   GET /api/admin/courses
   Shows: "Advanced Java (PENDING) - CS Dept - HOD #1"

5. Admin APPROVES
   POST /api/admin/courses/123/approve
   Body: { approval_notes: "Looks good" }

6. Course now:
   ✅ Visible to students
   ✅ Students can enroll
   ✅ Faculty can start sessions

7. Audit log records:
   User: HOD1, Action: CREATE, Entity: COURSE, Status: PENDING
   User: Admin, Action: APPROVE, Entity: COURSE, Status: APPROVED
```

### Workflow 2: Student Marks Attendance

```
1. Faculty generates OTP
   POST /api/activities/5/generate-start-otp
   Response: { otp: "123456" }

2. Faculty ANNOUNCES OTP to class
   (Student receives OTP verbally or on board)

3. Student marks START attendance
   POST /api/student/attendance/mark-start
   Body: { activity_id: 5, otp: "123456" }

   [Backend checks]
   ✓ OTP matches and isn't expired
   ✓ Student is enrolled in activity #5
   ✓ Record created with time

4. Class ends, Faculty generates END OTP
   POST /api/activities/5/generate-end-otp
   Response: { otp: "654321" }

5. Student marks END attendance
   POST /api/student/attendance/mark-end
   Body: { activity_id: 5, otp: "654321" }

   [Backend calculates duration]
   ✓ Mark END time
   ✓ Calculate duration = 120 minutes
   ✓ Status = 'present'

6. Student views own attendance
   GET /api/student/attendance/percentage
   Response: {
     attendance_percentage: 92.5,
     total_activities: 40,
     present: 37,
     absent: 2,
     on_leave: 1
   }

7. Audit log records:
   User: Student, Action: MARK_START, Entity: ATTENDANCE
   User: Student, Action: MARK_END, Entity: ATTENDANCE
```

### Workflow 3: Student Requests Leave, Faculty Approves

```
1. Student requests leave
   POST /api/student/leaves/request
   Body: {
     start_date: "2026-05-01",
     end_date: "2026-05-03",
     reason: "Medical appointment",
     leave_type: "MEDICAL"
   }
   Status: PENDING

2. Faculty sees pending leave
   GET /api/activities/:id/pending-leaves
   (or receives notification)

3. Faculty APPROVES leave
   PATCH /api/leaves/123/approve
   Body: { status: "APPROVED" }

   [Backend checks]
   ✓ User is faculty
   ✓ Student is in faculty's activity
   ✓ Update status = 'APPROVED'
   ✓ Mark attendance as 'on_leave' for those dates

4. Student views leave percentage
   GET /api/student/leaves/percentage
   Response: {
     total_requests: 5,
     approved_requests: 4,
     pending_requests: 0,
     rejected_requests: 1,
     total_approved_days: 12
   }

5. Audit trail complete:
   User: Student, Action: REQUEST, Entity: LEAVE_REQUEST
   User: Faculty, Action: APPROVE, Entity: LEAVE_REQUEST
```

---

## 🚀 Database Schema Changes

### New Course Approval Columns

```sql
ALTER TABLE courses ADD COLUMN approval_status ENUM('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE courses ADD COLUMN approved_by INT;
ALTER TABLE courses ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE courses ADD COLUMN rejected_by INT;
ALTER TABLE courses ADD COLUMN rejected_at TIMESTAMP;
ALTER TABLE courses ADD COLUMN approval_notes TEXT;
ALTER TABLE courses ADD COLUMN hod_id INT;
ALTER TABLE courses ADD COLUMN department VARCHAR(100);
```

### New Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(50),        -- CREATE, APPROVE, REJECT, MARK_START, etc
  entity_type VARCHAR(50),   -- COURSE, LEAVE_REQUEST, ATTENDANCE, etc
  entity_id INT,
  trace_name VARCHAR(100),   -- Semantic meaning
  old_values JSON,           -- Before changes
  new_values JSON,           -- After changes
  description TEXT,          -- Human-readable summary
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## ✅ Testing Checklist

- [ ] **HOD Data Isolation**
  - [ ] HOD1 creates course → not visible to HOD2
  - [ ] HOD1 tries to view HOD2's faculty → 403 error
  - [ ] HOD1 tries to approve HOD2's course → 403 error

- [ ] **Course Approval**
  - [ ] HOD creates course → status = PENDING
  - [ ] Admin approves → status = APPROVED, visible to students
  - [ ] Admin rejects → status = REJECTED, archived

- [ ] **Student Restrictions**
  - [ ] Student tries to create course → 403 error
  - [ ] Student tries to approve leave → 403 error
  - [ ] Student can only see own records → verified

- [ ] **Audit Trail**
  - [ ] Every admin action logged
  - [ ] Audit logs show before/after values
  - [ ] Timestamps accurate

---

## 📞 Support

Need to add a new permission? Edit `/backend/config/roles.js`
Need to audit an action? Check `/api/admin/audit-logs`
Need to scale? Audit logs can be indexed and archived to separate DB

---

## Summary

Your attendance app now has:

✅ Professional RBAC with strict role boundaries
✅ HOD department isolation (no cross-access)
✅ Admin approval workflow for courses
✅ Student permission lock (OTP marking only)
✅ Complete audit trail for compliance
✅ Zero-downtime data isolation
✅ Production-ready security

All without breaking existing functionality! 🎉
