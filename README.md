# Attendance-App
Attendance tracking application for Bannari Amman Institute Of Technology.

## 🐳 Docker Setup & Running

This project includes Dockerfiles and a `docker-compose.yml` to run the complete stack:
- **MySQL 8.0**: Pre-seeded with database schema, tables, and sample users.
- **Redis 7**: OTP caching and in-memory session handling.
- **Backend API**: Node.js & Express REST API (port `5000`).
- **Frontend App**: Expo / React Native Web application (port `8081`).

---

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/) installed.
- On Linux, if your user isn't in the `docker` group, prefix commands with `sudo` or run:
  ```bash
  sudo usermod -aG docker $USER
  newgrp docker
  ```

---

### Quick Start

1. **Configure Environment Variables**:
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   *(Optionally update passwords or secrets inside `.env`)*

2. **Start All Services**:
   ```bash
   docker compose up --build -d
   ```

3. **Check Running Containers**:
   ```bash
   docker compose ps
   ```

4. **Access the Services**:
   - **Frontend Web UI**: [http://localhost:8081](http://localhost:8081)
   - **Backend API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
   - **MySQL Database**: `localhost:3306` (Database: `attendance_db`, User: `attendance_user`, Password: `attendance_pass`)
   - **Redis Cache**: `localhost:6379`

---

### Default Seeded Test Accounts

The MySQL container initializes using `database/schema.sql` which includes sample accounts (all passwords are set to `123`):

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `123` | System Administrator |
| **HOD** | `hod-science@college.edu` | `123` | Head of Department (Science) |
| **Faculty** | `rajesh@college.edu` | `123` | Faculty member |
| **Faculty** | `priya@college.edu` | `123` | Faculty member |
| **Student** | `rahul@student.edu` | `123` | Student |
| **Student** | `sneha@student.edu` | `123` | Student |

---

### Common Docker Commands

- **View Logs**:
  ```bash
  # All logs
  docker compose logs -f

  # Specific service logs
  docker compose logs -f backend
  docker compose logs -f frontend
  docker compose logs -f mysql
  ```

- **Stop Services**:
  ```bash
  docker compose down
  ```

- **Stop Services & Remove Volumes (Reset Database)**:
  ```bash
  docker compose down -v
  ```

- **Rebuild Containers After Code Changes**:
  ```bash
  docker compose up --build -d
  ```
