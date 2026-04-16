# RBAC System Implementation Summary

## What Changed

### ✅ Created New Files

#### 1. `/backend/config/roles.js`

**Purpose:** Define role hierarchy, permissions matrix, and validation logic

**Key Functions:**

- `ROLES` - Constants: `admin`, `hod`, `faculty`, `student`
- `PERMISSIONS` - Maps permissions to allowed roles
- `hasPermission(permission, role)` - Check if role has permission
- `canApprove(approverRole, targetUserId, approverId, db)` - Hierarchical approval check
- `getDataAccessLevel(userId, userRole, db)` - Determine data visibility scope

**Usage:**

```javascript
const { hasPermission, canApprove } = require("../config/roles");

// Check if user has permission
if (!hasPermission("leave.approve", req.user.user_type)) {
  return res.status(403).json({ error: "Access denied" });
}
```

---

#### 2. `/backend/middleware/authEnhanced.js`

**Purpose:** Enhanced authorization middleware using RBAC

**Key Middleware:**

1. **`checkPermission(permission)`** - Fine-grained permission check

   ```javascript
   router.post(
     "/approve",
     auth,
     checkPermission("leave.approve"),
     controller.approve,
   );
   ```

2. **`requireRole(...roles)`** - Legacy role check (backward compatible)

   ```javascript
   router.post(
     "/create",
     auth,
     requireRole("faculty", "admin"),
     controller.create,
   );
   ```

3. **`canApproveRequest`** - Smart leave approval validation

   ```javascript
   router.patch(
     "/leaves/:id",
     auth,
     canApproveRequest,
     controller.updateStatus,
   );
   ```

   - Validates approval hierarchy automatically
   - Attaches leave request details to `req.leaveRequest`
   - No redundant checks needed in controller

4. **`canAccessUserData(targetUserId)`** - Data access control

   ```javascript
   router.get(
     "/users/:id/profile",
     auth,
     canAccessUserData(userId),
     controller.getProfile,
   );
   ```

5. **`enforceDepartmentIsolation`** - HOD department scoping
   ```javascript
   router.get("/leaves", auth, enforceDepartmentIsolation, controller.getAll);
   ```

   - Sets `req.isDepartmentFiltered` and `req.hodId`
   - Prevents HODs from seeing each other's data

---

### ✅ Updated Existing Files

#### 3. `/backend/routes/leaveRoutes.js`

**Changes:**

- Replaced simple `requireRole` with `canApproveRequest` for approval endpoint
- Added `enforceDepartmentIsolation` to leave listing endpoint
- Enhanced permission checking without changing controller logic

**Before:**

```javascript
router.patch(
  "/:id",
  auth,
  requireRole("faculty", "admin"),
  controller.updateStatus,
);
```

**After:**

```javascript
router.patch("/:id", auth, canApproveRequest, controller.updateStatus);
```

---

#### 4. `/backend/controllers/leaveRequestsController.js`

**Changes:**

- Simplified `updateStatus()` - removed redundant permission checks
- Enhanced `getAll()` to use department isolation from middleware
- Improved audit logging with more context

**Before:**

```javascript
// Manual permission check in controller
if (approverType !== "faculty" || approver_id !== faculty_id) {
  return res.status(403).json({ error: "Permission denied" });
}
```

**After:**

```javascript
// Permission already validated by middleware
// Controller just processes:
await db.query("UPDATE leave_requests SET status=? WHERE id=?", [status, id]);
```

---

## Architecture Diagram

```
Request → auth.js (verify token) → authEnhanced.js (check permission) → controller
                                       ↓
                              roles.js (permission logic)
                              ↓
                    + Determine data access level
                    + Check approval hierarchy
                    + Attach context to request
```

---

## Permission Flow Example: Leave Approval

```
1. User submits PATCH /api/leaves/5 with status=APPROVED

2. auth middleware:
   ✓ Verifies JWT token
   ✓ Decodes user info (id, user_type)

3. canApproveRequest middleware:
   ✓ Gets leave request #5 from database
   ✓ Identifies leave requester (student/faculty/admin)
   ✓ Checks if current user can approve this requester:
     - If admin: YES (can approve anyone)
     - If hod: Check if requester's report_to = user.id
     - If faculty: Check if requester in their activities
     - If student: NO (students cannot approve)
   ✗ If no permission: Return 403, log attempt
   ✓ If permission OK: Attach leave details to req.leaveRequest

4. updateStatus controller:
   ✓ trusts middleware validation
   ✓ Updates leave_requests table
   ✓ Logs audit trail
   ✓ Returns 200 OK
```

---

## Data Isolation for HODs

**Before:** HOD1 could potentially see HOD2's courses/faculty/leaves through improper queries

**After:** Built-in isolation at middleware + controller level

```javascript
// In controller with department isolation enabled:
if (isDepartmentFiltered && hodId) {
  query += " AND hod_id = ?";
  params.push(hodId);
}

// Result: HOD1 can only see courses where hod_id = HOD1_ID
// HOD2's data is completely invisible
```

---

## Backward Compatibility

**Old routes still work:**

```javascript
// This still works exactly as before:
router.post("/create", auth, requireRole("faculty"), controller.create);
```

**Gradual migration path:**

- Routes can use `requireRole` OR `checkPermission` OR `canApproveRequest`
- Mix and match as you update controllers
- No breaking changes to existing API contracts

---

## Permissions Defined for Attendance App

| Category   | Permission                   | Roles               |
| ---------- | ---------------------------- | ------------------- |
| Activities | `activities.create`          | faculty, admin      |
|            | `activities.view.own`        | faculty, student    |
|            | `activities.view.department` | hod, admin          |
| Attendance | `attendance.mark`            | student             |
|            | `attendance.view.activity`   | faculty, admin      |
|            | `attendance.view.department` | hod, admin          |
| Leave      | `leave.request`              | student, faculty    |
|            | `leave.approve`              | faculty, hod, admin |
|            | `leave.view.own`             | student, faculty    |
|            | `leave.view.team`            | hod, admin          |
| Courses    | `course.create`              | hod, admin          |
|            | `course.assign.faculty`      | hod, admin          |

---

## Testing Recommendations

### Unit Tests Needed:

1. `hasPermission()` returns correct boolean
2. `canApprove()` validates hierarchy correctly
3. `enforceDepartmentIsolation` sets correct context

### Integration Tests Needed:

1. Student submits leave → Faculty approves → HOD is notified
2. HOD1 cannot access HOD2's leaves
3. Admin can approve any leave from any department
4. Faculty cannot approve other faculty's leaves
5. Student cannot approve anyone's leaves

### Load Test:

- Permission checks cached or fast lookup?
- Database queries optimized with proper indexes?

---

## Benefits Summary

| Aspect                  | Before                             | After                            |
| ----------------------- | ---------------------------------- | -------------------------------- |
| **Permission Checking** | Scattered in routes & controllers  | Centralized in roles.js          |
| **Code Redundancy**     | Permissions checked multiple times | Single check at middleware       |
| **Data Isolation**      | Manual SQL WHERE clauses           | Automatic via middleware         |
| **Approval Hierarchy**  | Hard-coded in controller           | Determined by roles.js           |
| **Audit Trail**         | Basic logging                      | Enhanced with context            |
| **Future Changes**      | Update many files                  | Update roles.js + one middleware |

---

## Next Steps

1. ✅ **Created RBAC System** - roles.js + authEnhanced.js
2. ✅ **Updated Routes** - leaveRoutes.js now uses smart middleware
3. ✅ **Enhanced Controllers** - leaveRequestsController simplified
4. ⏳ **Test All Endpoints** - Verify approval flows work correctly
5. ⏳ **Migrate Other Routes** - Update activities.js, attendance.js to use RBAC
6. ⏳ **Admin Dashboard** - Add audit log viewer
7. ⏳ **HOD Dashboard** - Add department statistics

---

## File Index

```
backend/
├── config/
│   └── roles.js                    (NEW) - Permission definitions
├── middleware/
│   ├── auth.js                     (EXISTING) - Basic auth, backward compatible
│   └── authEnhanced.js             (NEW) - Enhanced RBAC middleware
├── routes/
│   ├── leaveRoutes.js              (UPDATED) - Uses new middleware
│   └── [other routes]              (TODO) - Gradually update
├── controllers/
│   ├── leaveRequestsController.js  (UPDATED) - Simplified with new middleware
│   └── [other controllers]         (TODO) - Clean up redundant checks
└── server.js                       (NO CHANGE) - Routes registered as before

docs/
└── RBAC_DOCUMENTATION.md           (NEW) - Full RBAC guide
```

---

## FAQ

**Q: Does this break existing API clients?**
A: No. API responses and endpoints are unchanged. Only internal auth logic changed.

**Q: Do I have to use the new middleware everywhere?**
A: No. Existing `requireRole` still works. Migrate gradually.

**Q: Can I add new permissions easily?**
A: Yes. Add to `PERMISSIONS` object in roles.js, then use in routes.

**Q: What if I need custom permission logic?**
A: Add a new function to roles.js and call it from a custom middleware.

**Q: Is there performance impact?**
A: Minimal. One additional database query for hierarchical checks (can be cached).

---

## Summary

The attendance app now has a **professional, scalable RBAC system** that:

- ✅ Prevents HODs from seeing each other's data
- ✅ Validates leave approval hierarchies automatically
- ✅ Centralizes permission logic for maintainability
- ✅ Reduces code duplication in controllers
- ✅ Provides audit trails for compliance
- ✅ Remains backward compatible

Ready for production with proper testing.
