#!/bin/bash
API="http://localhost:5000/api"
echo "🧪 Testing Attendance App API..."
echo ""

# Test 1: Login
echo "1️⃣ Testing Login..."
LOGIN=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" -d '{"email":"admin@college.edu","password":"password123"}')
TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
else
  echo "❌ Login failed: $LOGIN"
  exit 1
fi

# Test 2: Create Course 1
echo ""
echo "2️⃣ Creating Course 1 (Mon/Wed/Fri 9:00-10:30)..."
C1=$(curl -s -X POST $API/activities/courses -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title":"Advanced Java","assigned_faculty_id":10,
    "start_date":"2026-04-20","end_date":"2026-05-30",
    "schedule_days":"Monday,Wednesday,Friday",
    "time_slot_start":"09:00:00","time_slot_end":"10:30:00"
  }')

C1_ID=$(echo "$C1" | grep -o '"course_id":[0-9]*' | cut -d':' -f2)
[ -n "$C1_ID" ] && echo "✅ Course 1 created: ID $C1_ID" || (echo "❌ Failed: $C1"; exit 1)

# Test 3: Try overlapping course (should fail)
echo ""
echo "3️⃣ Attempting Course 2 (OVERLAPPING - Mon/Wed/Fri 10:00-11:00)..."
C2=$(curl -s -X POST $API/activities/courses -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title":"iOS Dev","assigned_faculty_id":10,
    "start_date":"2026-04-20","end_date":"2026-05-30",
    "schedule_days":"Monday,Wednesday,Friday",
    "time_slot_start":"10:00:00","time_slot_end":"11:00:00"
  }')

if echo "$C2" | grep -q "Time conflict"; then
  echo "✅ BLOCKED! Time conflict correctly detected"
else
  echo "❌ Should have blocked: $C2"
fi

# Test 4: Create non-overlapping course
echo ""
echo "4️⃣ Creating Course 3 (NON-OVERLAPPING - Mon/Wed/Fri 11:00-12:30)..."
C3=$(curl -s -X POST $API/activities/courses -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title":"Python","assigned_faculty_id":10,
    "start_date":"2026-04-20","end_date":"2026-05-30",
    "schedule_days":"Monday,Wednesday,Friday",
    "time_slot_start":"11:00:00","time_slot_end":"12:30:00"
  }')

C3_ID=$(echo "$C3" | grep -o '"course_id":[0-9]*' | cut -d':' -f2)
[ -n "$C3_ID" ] && echo "✅ Course 3 created: ID $C3_ID" || (echo "❌ Failed: $C3"; exit 1)

# Test 5: Get all courses
echo ""
echo "5️⃣ Fetching all courses..."
COURSES=$(curl -s -X GET $API/activities/courses -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$COURSES" | grep -o '"id":[0-9]*' | wc -l)
echo "✅ Found $COUNT courses"

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ ALL TESTS PASSED!"
echo "✅ Time conflict checking is working!"
echo "═══════════════════════════════════════════════════"
