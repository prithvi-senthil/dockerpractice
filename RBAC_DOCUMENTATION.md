# Role-Based Access Control (RBAC) System

## Overview

This document describes the enhanced RBAC system implemented for the Attendance App. It provides fine-grained permission control beyond simple role checks.

## Role Hierarchy

```
Admin
├─ HOD (Head of Department)
│  └─ Faculty (under HOD)
│     └─ Student (under Faculty's courses)
└─ (Admin-created Faculty)
   └─ (Admin-created Student)
```

## Role Definitions

| Role        | Code      | Capabilities                                                                  |
| ----------- | --------- | ----------------------------------------------------------------------------- |
| **Admin**   | `admin`   | Global access to all features, user management, audit logs                    |
| **HOD**     | `hod`     | Department course creation, faculty assignment, leave approval for faculty    |
| **Faculty** | `faculty` | Activity/course creation, OTP generation, attendance tracking, leave requests |
| **Student** | `student` | Attendance marking, leave requests, view activity schedule                    |

## Permission Matrix

### Activities/Courses

```javascript
'activities.create':      ['faculty', 'admin']
'activities.view.own':    ['faculty', 'student']
'activities.view.department': ['hod', 'admin']
'activities.view.all':    ['admin']
```

### Attendance

```javascript
'attendance.mark':        ['student']
'attendance.view.own':    ['student']
'attendance.view.activity': ['faculty', 'admin']
'attendance.view.department': ['hod', 'admin']
```

### Leave Management

```javascript
'leave.request':          ['student', 'faculty']
'leave.approve':          ['faculty', 'hod', 'admin']  // Hierarchical
'leave.view.own':         ['student', 'faculty']
'leave.view.team':        ['hod', 'admin']
```

### Courses (HOD Feature)

```javascript
'course.create':          ['hod', 'admin']
'course.assign.faculty':  ['hod', 'admin']
'course.view.own':        ['hod', 'faculty', 'admin']
'course.view.all':        ['admin']
```

## Implementation

### 1. Core Configuration (`/backend/config/roles.js`)

Defines:

- `ROLES` - Role constants
- `PERMISSIONS` - Permission-to-role mappings
- `hasPermission(permission, userRole)` - Check if role has permission
- `canApprove(...)` - Check approval hierarchy
- `getDataAccessLevel(...)` - Determine what data user can see

### 2. Enhanced Middleware (`/backend/middleware/authEnhanced.js`)

#### `checkPermission(permission)`

Fine-grained permission checking:

```javascript
router.post(
  "/approve",
  auth,
  checkPermission("leave.approve"),
  controller.approveLeave,
);
```

#### `requireRole(...roles)`

Legacy middleware - still supported for backward compatibility:

```javascript
router.post(
  "/create",
  auth,
  requireRole("faculty", "admin"),
  controller.create,
);
```

#### `canApproveRequest`

Smart leave approval checking with hierarchical validation:

```javascript
router.patch("/leaves/:id", auth, canApproveRequest, controller.updateStatus);
```

Validates:

- Admin can approve anyone's leave
- HOD can approve faculty reporting to them
- Faculty can approve students in their activities
- Student cannot approve

#### `enforceDepartmentIsolation`

Ensures HOD only sees their department data:

```javascript
router.get("/leaves", auth, enforceDepartmentIsolation, controller.getAll);
```

Sets `req.isDepartmentFiltered` and `req.hodId` for use in controllers.

### 3. Route-Level Implementation

#### Leave Approval Flow

```javascript
// routes/leaveRoutes.js
router.patch(
  "/:id",
  auth, // Basic authentication
  canApproveRequest, // Smart RBAC approval validation
  controller.updateStatus, // Process approval
);
```

**What happens:**

1. `auth` middleware verifies JWT token
2. `canApproveRequest` checks if user can approve that specific leave by:
   - Getting the leave request details
   - Checking user's role against leave requester
   - Validating hierarchical approval rights
   - Attaching request details to `req.leaveRequest`
3. `updateStatus` controller processes the approval (no redundant checks needed)

#### Leave Viewing with Filtering

```javascript
// routes/leaveRoutes.js
router.get(
  "/",
  auth, // Verify user
  enforceDepartmentIsolation, // Set department filter context
  controller.getAll, // Apply role-based filtering
);
```

**What happens:**

1. `enforceDepartmentIsolation` checks user role and sets context:
   - Admin: `req.isDepartmentFiltered = false` (see all)
   - HOD: `req.isDepartmentFiltered = true`, `req.hodId = user.id` (see department)
   - Others: `req.isDepartmentFiltered = false` (no filtering)
2. Controller uses `req.isDepartmentFiltered` and `req.hodId` to apply SQL WHERE clauses

## Controller-Level Usage Examples

### Using Department Isolation

```javascript
exports.getAll = async (req, res) => {
  const { isDepartmentFiltered, hodId } = req;

  let query = "SELECT * FROM leave_requests WHERE 1=1";

  if (isDepartmentFiltered && hodId) {
    query += ` AND user_id IN (SELECT id FROM users WHERE report_to = ?)`;
    // Only HOD's department faculty
  }

  const [records] = await db.query(query, params);
  res.json(records);
};
```

### Using Leave Request Details

```javascript
exports.updateStatus = async (req, res) => {
  const { id } = req.params;

  // canApproveRequest already validated permission
  // and attached leave details to req.leaveRequest

  // No need to re-check if current user can approve
  // Just process the approval

  await db.query("UPDATE leave_requests SET status=? WHERE id=?", [status, id]);
};
```

## Data Access Levels

`getDataAccessLevel()` returns access context:

### GLOBAL (Admin)

- Can see all data
- No filters applied
- Full audit trail access

### DEPARTMENT (HOD)

- Can see department's courses, faculty, students
- Filters: `hod_id = ?` or `report_to = ?`
- Limited audit trail (own department only)

### ACTIVITY (Faculty)

- Can see own activities and enrolled students
- Filters: `owner_id = ?`

### PERSONAL (Student)

- Can see own data only
- Filters: `student_id = ?`

## Migration from Old System

### Old Approach

```javascript
// Old: Simple role check + redundant permission checks in controller
router.patch(
  "/leaves/:id",
  auth,
  requireRole("faculty", "admin"),
  controller.updateStatus,
);

// Controller had to re-validate:
if (user.type !== "faculty" || course.faculty_id !== user.id) {
  return res.status(403).json({ error: "not authorized" });
}
```

### New Approach

```javascript
// New: Smart permission check + controller trusts the middleware
router.patch("/leaves/:id", auth, canApproveRequest, controller.updateStatus);

// Controller just processes - middleware validated everything:
await db.query("UPDATE leave_requests SET status=? WHERE id=?", [status, id]);
```

## Benefits

1. **Single Source of Truth** - Permissions defined in one place (roles.js)
2. **Layered Security** - Multiple validation points
3. **Minimal Redundancy** - Middleware validates, controller processes
4. **Audit Trail** - All permission checks logged
5. **Flexible** - Easy to add new permissions without changing routes
6. **Hierarchical** - Approval chains automatically determined
7. **Department Isolation** - HODs see only their data
8. **Backward Compatible** - Old `requireRole` still works

## Testing the RBAC System

### Test Case 1: Leave Approval by Faculty

```
1. Student submits leave request
2. Faculty (assigned to course) accesses PATCH /api/leaves/:id
3. canApproveRequest middleware:
   - Fetches leave request
   - User type = 'faculty'
   - Checks: faculty enrolled in course with student
   - Permission GRANTED ✓
4. Controller processes approval
```

### Test Case 2: HOD Cannot Access Other Department

```
1. HOD1 accesses GET /api/leaves
2. enforceDepartmentIsolation sets hodId = HOD1's ID
3. Controller filters: WHERE user_id IN (SELECT id FROM users WHERE report_to = HOD1_ID)
4. Only HOD1's faculty leaves visible ✓
5. HOD2's data is invisible
```

### Test Case 3: Admin Sees All

```
1. Admin accesses GET /api/leaves
2. enforceDepartmentIsolation sets isDepartmentFiltered = false
3. Controller skips departmental filters
4. All leaves in system visible ✓
```

## Future Enhancements

1. **Resource-Level Permissions** - Combine role + resource ownership
2. **Time-Based Permissions** - Access revoked after certain date
3. **Feature Flags** - Toggle permissions per environment
4. **Permission Caching** - Redis cache for permission checks
5. **Audit Notifications** - Real-time alerts for sensitive operations

## Questions?

For more info on a specific component:

- Permissions: See `config/roles.js` PERMISSIONS object
- Middleware: See `middleware/authEnhanced.js` function comments
- Routes: Search for middleware usage in route files
