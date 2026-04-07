# 🎓 Attendance Tracking App - Complete Setup Guide

## ✅ **What's Been Built**

Your attendance app now has a **complete OTP-based attendance system** with role-based access for Admin, Faculty, and Students.

---

## 🏗️ **System Architecture**

### **Database Schema**

- ✅ **courses** - Created by admin with faculty assignment
- ✅ **course_sessions** - Recurring sessions (Mon/Wed/Fri, etc.)
- ✅ **course_enrollments** - Student-to-course mappings
- ✅ **session_attendance** - OTP-based attendance records
- ✅ **leave_requests** - Leave management system

### **Backend APIs**

All endpoints are fully functional:

**Authentication:**

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user

**Course Management (Admin Only):**

- `POST /api/activities/courses` - Create course with faculty & schedule
- `GET /api/activities/courses` - List courses (role-filtered)
- `GET /api/activities/courses/:id` - Course details

**Session Management:**

- `GET /api/activities/sessions` - List sessions (role-filtered)
- `GET /api/activities/sessions/:id` - Session details
- `GET /api/activities/sessions/:id/students` - Students in session

**OTP Management (Faculty Only):**

- `POST /api/activities/sessions/:id/generate-start-otp` - Generate start OTP
- `POST /api/activities/sessions/:id/generate-end-otp` - Generate end OTP

**Attendance (Students):**

- `POST /api/attendance/mark-start` - Mark start attendance with OTP
- `POST /api/attendance/mark-end` - Mark end attendance with OTP
- `GET /api/attendance/my-attendance` - View attendance records
- `GET /api/attendance/summary` - Attendance statistics

**Leave System:**

- `POST /api/leave/request` - Submit leave request
- `GET /api/leave/my-requests` - View leave requests
- `GET /api/leave/statistics` - Leave balance & percentage

---

## 📱 **Frontend Screens**

### **For Students:**

1. **📅 Calendar** - View all courses and today's sessions
2. **📋 Attendance History** - View attendance records & percentage
3. **📝 Leave Requests** - Request leaves and see balance
4. **👤 Profile** - View user type and info

**Attendance Flow:**

- Student views "Today's Sessions" on Calendar
- Session shows status (scheduled/ongoing/completed)
- If ongoing → can click "Mark Attendance"
- Enter 6-digit OTP → marks start/end attendance

### **For Faculty:**

1. **📅 Calendar** - View assigned courses & sessions
2. **📝 Leave Requests** - Approve/reject student leaves
3. **👤 Profile** - View faculty info

**OTP Flow:**

- Faculty clicks session → "Manage OTP"
- Can generate Start OTP (time-limited)
- Can generate End OTP (only if session ongoing)
- OTPs expire after 5 minutes automatically

### **For Admin:**

1. **📅 Calendar** - View all courses & sessions
2. **➕ Create Course** - Create new courses with:
   - Course title & code
   - Faculty assignment
   - Max students
   - Schedule days (Mon/Mon-Wed-Fri, etc.)
   - Time slots
   - Duration (start-end dates)
3. **👤 Profile** - Admin info

---

## 🔑 **Test Credentials**

Use these to test the app:

```
ADMIN:   admin@college.edu / admin123
FACULTY: rajesh@college.edu / password123
STUDENT: rahul@student.edu / password123
```

---

## 🚀 **How to Use**

### **1. Create a Course (Admin)**

1. Login as admin
2. Go to "➕ Create" tab
3. Fill course details:
   - Title: "Full Stack Development"
   - Code: "CS401"
   - Assign Faculty: Select from list
   - Days: Select Monday, Wednesday, Friday
   - Time: 09:00 - 10:00
   - Duration: 3 months
4. Click "Create Course"

### **2. Generate OTP (Faculty)**

1. Login as faculty
2. Go to "📅 Calendar"
3. Click today's session
4. Click "Generate Start OTP"
5. Share the 6-digit OTP with students
6. Students enter OTP to mark attendance

### **3. Mark Attendance (Student)**

1. Login as student
2. Go to "📅 Calendar" → "Today's Sessions"
3. Find the session (must say "ongoing")
4. Click "📝 Mark Attendance"
5. Enter the 6-digit OTP from faculty
6. Click "Mark Start Attendance"
7. Later: Click "Mark End Attendance" with end OTP

### **4. Request Leave (Student)**

1. Go to "📝 Leaves"
2. Select From & To dates
3. Enter leave type (Medical/Personal/Emergency/Other)
4. Enter reason
5. Click "Submit Leave Request"
6. View balance and history

---

## 🔒 **OTP System Details**

**How it works:**

- Faculty generates OTP during session time
- OTP is 6-digit code, valid for 5 minutes
- OTP stored in Redis with automatic expiry
- Student enters OTP → marks attendance with timestamp
- Duration auto-calculated between start & end

**Security:**

- OTP only works for that specific session
- Only enrolled students can enter OTP
- Faculty can see active OTP on screen
- Timestamps recorded for duration calculation

---

## 📊 **Leave System Details**

**Features:**

- Track leave requests (Medical/Personal/Emergency/Other)
- Show total leave balance
- Display used leaves & remaining days
- Calculate leave percentage
- Admin can approve/reject with remarks
- Attendance % calculated: `present_count / total_sessions * 100`
- Warning if attendance < 75%

---

## ⚙️ **Technical Stack**

**Backend:**

- Node.js + Express
- MySQL (Courses, Sessions, Enrollments, Attendance)
- Redis (OTP storage with 5-min expiry)
- JWT Authentication
- bcrypt Password Hashing

**Frontend:**

- React Native (Expo)
- React Navigation (Bottom Tabs + Stack)
- AsyncStorage (Local token storage)
- Axios (API calls)

**API Base URL:** `http://10.96.118.121:5000/api`

---

## 📝 **Database Tables Reference**

### courses

```
id, title, course_code, description, max_students,
assigned_faculty_id, created_by, created_at
```

### course_sessions

```
id, course_id, session_date, start_time, end_time,
start_otp, end_otp, otp_generated_at, status, created_at
```

### course_enrollments

```
id, course_id, student_id, enrolled_by, enrolled_at
```

### session_attendance

```
id, session_id, student_id, start_marked_at, end_marked_at,
status, duration_minutes, created_at
```

### leave_requests

```
id, student_id, from_date, to_date, leave_type, reason,
status, admin_remarks, created_at
```

---

## 🔧 **Running the App**

**Backend:**

```bash
cd backend
npm start
# Runs on http://0.0.0.0:5000
```

**Frontend:**

```bash
cd frontend
npx expo start
# Scan QR code with Expo Go app
```

---

## 📋 **Role-Based Permissions**

### **Admin**

✅ Create courses  
✅ Assign faculty to courses  
✅ View all courses & sessions  
✅ View calendar  
✅ Manage students (add/remove)

### **Faculty**

✅ View assigned courses  
✅ Generate Start/End OTP  
✅ View enrolled students  
✅ View attendance records  
✅ Review leave requests

### **Student**

✅ View enrolled courses  
✅ View personal sessions  
✅ Enter OTP to mark attendance  
✅ View personal attendance history  
✅ Request leaves  
✅ View leave balance & percentage

---

## ✨ **Key Features**

1. **Calendar View** - See courses/sessions by date
2. **OTP-Based Attendance** - 6-digit time-limited codes
3. **Leave Management** - Track leaves & balance
4. **Attendance Percentage** - Auto-calculated with warnings
5. **Role-Based UI** - Different screens for admin/faculty/student
6. **Student Enrollment** - Admin/Faculty can enroll students
7. **Recurring Sessions** - Automate session creation by days of week
8. **Real-time Status** - Session shows scheduled/ongoing/completed

---

**🎉 Your attendance app is ready to use!**

Start by logging in as admin to create a test course, then assign students and test the OTP flow!
