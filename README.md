# micro-AIMS 🎓

**Academic Information Management System** - A streamlined course enrollment platform with multi-stage approval workflow.

## 📋 Overview

micro-AIMS is a web-based academic course enrollment system that allows:
- **Students** to browse and request enrollment in courses
- **Instructors** to review and approve/reject enrollment requests
- **Advisors** to provide final approval for enrollments
- **Admins** to manage users and courses

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MICRO-AIMS ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            │
│  │   FRONTEND  │  HTTP   │   BACKEND   │  DB     │  MONGODB    │            │
│  │   (React)   │◄───────►│  (Express)  │◄───────►│   Atlas     │            │
│  │  Port 8080  │   API   │  Port 5000  │         │             │            │
│  └─────────────┘         └─────────────┘         └─────────────┘            │
│                                 │                                            │
│                                 │ SMTP                                       │
│                                 ▼                                            │
│                          ┌─────────────┐                                    │
│                          │   GMAIL     │                                    │
│                          │  (Email)    │                                    │
│                          └─────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Enrollment Workflow

```
  STUDENT                INSTRUCTOR              ADVISOR               RESULT
    │                        │                      │                     │
    │  Request Enrollment    │                      │                     │
    │───────────────────────►│                      │                     │
    │                        │                      │                     │
    │        📧 Email        │                      │                     │
    │        Notification    │                      │                     │
    │                        │                      │                     │
    │                        │  Approve/Reject      │                     │
    │                        │─────────────────────►│                     │
    │                        │                      │                     │
    │                        │       📧 Email       │                     │
    │                        │       Notification   │                     │
    │                        │                      │                     │
    │                        │                      │  Approve/Reject     │
    │                        │                      │────────────────────►│
    │                        │                      │                     │
    │◄────────────────────────────────────────────────────────────────────│
    │                      📧 Final Status Email                          │
    │                                                                     │
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Email | Nodemailer (Gmail SMTP) |
| Authentication | OTP-based (Email verification) |

## 📁 Project Structure

```
course-compass/
├── src/                      # Frontend (React)
│   ├── components/           # UI Components
│   ├── contexts/             # React Context (Auth)
│   ├── pages/                # Page Components
│   ├── services/             # API Service
│   └── types/                # TypeScript Types
│
├── server/                   # Backend (Node.js)
│   ├── src/
│   │   ├── models/           # MongoDB Models
│   │   ├── routes/           # API Routes
│   │   ├── services/         # Email Service
│   │   ├── index.js          # Server Entry
│   │   └── seed.js           # Database Seeder
│   ├── .env                  # Environment Variables
│   └── package.json          # Backend Dependencies
│
├── package.json              # Frontend Dependencies
└── README.md                 # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- Gmail account with App Password

### 1. Clone the Repository

```bash
git clone https://github.com/sadineni2-quabyt/course-compass.git
cd course-compass
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd server
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the `server` directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aims

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080
```

> **Note:** To get Gmail App Password:
> 1. Enable 2-Factor Authentication on your Google Account
> 2. Go to https://myaccount.google.com/apppasswords
> 3. Generate a new App Password for "Mail"

### 5. Seed the Database

```bash
cd server
npm run seed
```

This creates:
- 4 Instructors
- 2 Advisors  
- 1 Admin
- 5 Sample Courses

### 6. Start the Backend Server

```bash
cd server
npm run dev
```

Server runs at: http://localhost:5000

### 7. Start the Frontend (New Terminal)

```bash
# In project root
npm run dev
```

Frontend runs at: http://localhost:8080

## 👥 User Roles

| Role | Description | Access |
|------|-------------|--------|
| **Student** | Default role for new users | Browse courses, request enrollment, view history |
| **Instructor** | Pre-registered in database | Approve/reject enrollment requests for their courses |
| **Advisor** | Pre-registered in database | Final approval for enrollments |
| **Admin** | Pre-registered in database | Manage all users and courses |

### Role Assignment

- **New users** logging in for the first time → Automatically registered as **Student**
- **Instructors/Advisors/Admin** → Must be pre-registered in the database via seed script or admin panel

## 📧 Email Notifications

The system sends email notifications at each step:

| Event | Recipient | Email Subject |
|-------|-----------|---------------|
| Student requests enrollment | Instructor | "New Enrollment Request: [Course]" |
| Instructor approves | Advisor | "Enrollment Pending Advisor Approval" |
| Final approval | Student | "🎉 Enrollment Confirmed" |
| Rejection (any step) | Student | "Enrollment Request Rejected" |

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/auth/check-user/:email` - Check if user exists

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/open` - Get open courses
- `POST /api/courses` - Create course (Admin)
- `PUT /api/courses/:id` - Update course

### Enrollments
- `POST /api/enrollments` - Create enrollment request
- `GET /api/enrollments/student/:id` - Get student's enrollments
- `GET /api/enrollments/instructor/:id` - Get instructor's pending requests
- `GET /api/enrollments/advisor/:id` - Get advisor's pending requests
- `PATCH /api/enrollments/:id/instructor-action` - Approve/reject (Instructor)
- `PATCH /api/enrollments/:id/advisor-action` - Approve/reject (Advisor)

### Users
- `GET /api/users` - Get all users
- `GET /api/users/role/:role` - Get users by role
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🧪 Testing the Flow

1. **Login as Student** (any new email)
   - Browse available courses
   - Request enrollment for a course

2. **Check Instructor Email**
   - Instructor receives email notification

3. **Login as Instructor** (pre-registered email)
   - View pending requests
   - Approve or reject

4. **Login as Advisor** (pre-registered email)
   - View requests needing final approval
   - Approve or reject

5. **Check Student Email**
   - Receives final status notification
