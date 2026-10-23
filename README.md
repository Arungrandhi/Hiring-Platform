# Saanvika Software Solutions | MERN Stack Hiring Examination & Recruitment Platform

A professional, secure, and responsive **Hiring Examination and Recruitment Management Platform** built using the MERN stack (MongoDB, Express.js, React.js with Vite, and Node.js) with strict server-enforced Role-Based Access Control (RBAC).

---

## 1. Project Overview & Multi-Role Architecture

The platform provides a complete ecosystem for end-to-end recruitment drives, cheat-resistant examinations, and multi-stage candidate progression across three primary roles:

### 1. Super Admin
- **Governance & Monitoring**: Comprehensive platform dashboard with live telemetry: Total Admins, Active Admins, Total Students, Total Recruitment Drives, and Total Examination Attempts.
- **Admin Management**: Provision recruiter Admins with name, email, phone, and secure password; activate or deactivate accounts; reset administrator passwords; inspect associated drives and subjects.
- **Activity Monitoring**: Immutable audit trail tracking administrative actions (admin provisioning, subject creation, paper publication, drive launch, code regeneration, candidate shortlisting, and stage progression). Non-sensitive metadata only (passwords, tokens, and answer keys are never logged).

### 2. Admin (Recruiter)
- **Subject Management**: Categorize assessments by subject with unique names and course codes.
- **Question Paper Engine**: Author subject-wise assessments with configurable difficulty, duration, total marks, passing thresholds, and optional negative marking. Questions support 4 multiple-choice options, designated correct answers, marks, and explanations. Papers can be previewed, edited, published, or archived.
- **Recruitment Drive Management**: Create drives with name, job title, description, eligibility criteria, date windows, and assigned question papers. Automatically generates unique, unpredictable access codes (e.g. `HIRE-TECH26`).
- **Examination Results**: Real-time evaluation dashboard showing student score, percentage, pass/fail status, submission timestamp, and an answer sheet inspector modal.
- **Candidate Progression Pipeline**: 6-stage recruitment workflow:
  1. Examination
  2. Group Discussion (GD)
  3. Technical Interview
  4. HR Interview
  5. CEO Interview
  6. Selected or Rejected
  Shortlist candidates, schedule interview dates/times/meeting URLs, record evaluation scores, candidate notes, and internal administrative remarks. Maintains a complete stage transition history.

### 3. Student (Candidate)
- **Secure Registration & Profile**: Register with full name, email, phone, college/university, qualification, graduation year, and department.
- **Drive Entry via Access Code**: Join recruitment drives using unique access codes (e.g. `HIRE-TECH26`). System validates active dates, drive status, and prevents duplicate registrations.
- **Cheat-Resistant Examination Experience**:
  - Pre-exam guidelines and attempt constraints.
  - Server-synchronized countdown timer with automatic submission on expiration.
  - Palette navigation with Answered, Unanswered, and Flagged status.
  - Clear Selection and Option Switching.
  - Periodic draft answer auto-saving to prevent data loss on page refresh.
  - **Zero Answer Leakage**: Correct answer keys and explanations are completely excluded from student payloads.
  - Server-side score and percentage calculation.
- **Exam History & Recruitment Progress**: View past examination attempts, scores, and track current recruitment rounds, interview schedules, and meeting links. Internal recruiter remarks remain hidden.

---

## 2. Mandatory Technology Stack

### Frontend
- **React 18** with **Vite**
- **React Router DOM v6** (declarative client-side routing & route guards)
- **Bootstrap 5** (responsive layouts, modern cards, modals, and badges)
- **Axios** (custom instance with interceptors for Bearer tokens and 401 handling)
- **Lucide React** (icons)
- **Context API** (`AuthContext` for user session & token state)
- **Session Storage** (`sessionStorage` for token and basic user data)
- **AOS** (subtle animations)

### Backend
- **Node.js** (v22+)
- **Express.js**
- **MongoDB** with **Mongoose** (schema validation, indexes, pre-hooks)
- **JWT (JSON Web Tokens)** (short-lived access tokens)
- **bcryptjs** (password hashing)
- **Helmet, CORS & express-rate-limit** (security headers, origin protection, rate limiting)
- **Morgan** (request logging)

### Database
- **Local MongoDB Server**: `mongodb://127.0.0.1:27017/hiring_platform`
- **MongoDB Compass**: Graphical user interface to inspect collections and records.

---

## 3. Pre-Configured Demo Credentials

For testing and verification, the platform comes pre-seeded with three accounts:

| Role | Email | Password | Primary Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@hiringplatform.com` | `SuperAdmin@123` | Platform oversight, Admin management, Audit logs |
| **Admin** | `admin@techcorp.com` | `Admin@123` | Subjects, Question Papers, Recruitment Drives, Pipeline |
| **Student** | `student@example.com` | `Student@123` | Join drives, Take exam, View history & progress |

> **Active Demo Drive Code**: `HIRE-TECH26` (Saanvika Software Solutions 2026 Graduate Software Engineer Drive)

---

## 4. Local Installation and Setup Guide

### Prerequisites
1. **Node.js** (v18 or higher recommended)
2. **MongoDB Community Server** installed and running on `localhost:27017`.
3. **MongoDB Compass** (optional, to view collections).

### Step 1: Clone or Navigate to Project
```bash
cd d:\REACT\CARRER\Hiring-Platform
```

### Step 2: Configure Environment Files

**Backend (`server/.env`)**:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/hiring_platform
JWT_SECRET=super_secure_jwt_secret_key_change_in_production_9876543210
JWT_EXPIRES_IN=30m
CLIENT_URL=http://localhost:5173
```

**Frontend (`client/.env`)**:
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 4: Seed Initial Super Admin and Demo Data
In the `server` directory, run:
```bash
# Seed initial Super Admin account
npm run seed:superadmin

# Seed full realistic demo dataset (Admin, Subjects, 5-question Paper, Drive with code HIRE-TECH26, Student)
npm run seed:demo
```

### Step 5: Start the Servers
Open two terminal windows:

**Terminal 1 (Backend API on Port 5000)**:
```bash
cd server
npm start
```
*Health check available at: `http://localhost:5000/api/health`*

**Terminal 2 (Frontend Client on Port 5173)**:
```bash
cd client
npm run dev
```
*Application available at: `http://localhost:5173`*

---

## 5. MongoDB Compass Verification Guide

1. Open **MongoDB Compass**.
2. Connect to URI: `mongodb://127.0.0.1:27017`.
3. Locate the `hiring_platform` database.
4. Inspect the collections:
   - `users`: Contains `superadmin`, `admin`, and `student` documents with hashed passwords.
   - `subjects`: Categorized academic and technical domains.
   - `questionpapers`: Assessments with multiple choice options and answer keys.
   - `recruitmentdrives`: Active recruitment drives with unique `driveCode` index.
   - `driveregistrations`: Compound unique index on `(student, drive)`.
   - `examattempts`: Examination attempts, paper snapshots, student answers, and server scores.
   - `candidateprogresses`: Pipeline rounds, evaluations, meeting links, and transition history.
   - `activitylogs`: Audit trail of all administrative and system events.

---

## 6. End-to-End Testing & RBAC Verification

An automated verification test script is located in `server/scripts/testRBACAndWorkflows.js`.
To run the automated test suite:
```bash
cd server
node scripts/testRBACAndWorkflows.js
```

### Verification Results: 21 Passed, 0 Failed
```text
========================================================
STARTING AUTOMATED BACKEND RBAC & WORKFLOW VERIFICATION
========================================================

[PASS] Super Admin login successful
[PASS] Admin login successful
[PASS] Student login successful

--- Running RBAC Security Enforcement Tests ---
[PASS] Unauthenticated request correctly rejected with 401 Unauthorized
[PASS] Student blocked from Super Admin stats (403 Forbidden)
[PASS] Admin blocked from Super Admin activity logs (403 Forbidden)
[PASS] Admin blocked from creating another Admin (403 Forbidden)
[PASS] Student blocked from creating recruitment drive (403 Forbidden)
[PASS] Duplicate email registration correctly rejected with 400 Bad Request

--- Running End-to-End Recruitment & Exam Workflow Tests ---
[PASS] Invalid drive code correctly rejected (404 Not Found)
[PASS] Student successfully validated and joined HIRE-TECH26
[PASS] Exam instructions retrieved
[PASS] Exam attempt started or resumed
[PASS] CRITICAL SECURITY: Answer keys and explanations are completely hidden from student during exam!
[PASS] Draft answers saved successfully during examination
[PASS] Exam submitted and server calculated score: 6/10 (60%)
[PASS] Admin retrieved drive examination results (count: 1)
[PASS] Admin shortlisted candidate for next recruitment round (GD)
[PASS] Admin scheduled GD round with meeting details and candidate notes
[PASS] Student views updated stage (GD) and internal admin remarks are securely masked from student view
[PASS] Super Admin monitors real-time activity audit logs (recorded count: 9)

========================================================
VERIFICATION SUMMARY: 21 PASSED, 0 FAILED
========================================================
```

---

## 7. Complete API Reference

### Health
- `GET /api/health` — Public health check & DB connection status.

### Authentication
- `POST /api/auth/register` — Student registration.
- `POST /api/auth/login` — Sign in for Super Admin, Admin, and Student.
- `GET /api/auth/me` — Authenticated user details.
- `PUT /api/auth/profile` — Update user profile.
- `PUT /api/auth/change-password` — Change password.
- `POST /api/auth/logout` — Logout and record session termination.

### Super Admin (Requires `superadmin` role)
- `GET /api/superadmin/stats` — Platform metrics.
- `GET /api/superadmin/admins` — Searchable & paginated admin list.
- `GET /api/superadmin/admins/:id` — Admin details and associated drives.
- `POST /api/superadmin/admins` — Create Admin account.
- `PUT /api/superadmin/admins/:id` — Update status (activate/deactivate).
- `PUT /api/superadmin/admins/:id/reset-password` — Reset Admin password.
- `GET /api/superadmin/activities` — Platform activity audit trail.

### Subjects (Requires `admin` or `superadmin` role)
- `GET /api/subjects` — List subjects with paper counts.
- `POST /api/subjects` — Create subject.
- `PUT /api/subjects/:id` — Edit subject.
- `PATCH /api/subjects/:id/toggle-status` — Toggle active/inactive.

### Question Papers (Requires `admin` or `superadmin` role)
- `GET /api/question-papers` — List papers.
- `GET /api/question-papers/:id` — Full paper preview with answers.
- `POST /api/question-papers` — Create paper with MCQs.
- `PUT /api/question-papers/:id` — Edit paper & bump version.
- `PATCH /api/question-papers/:id/publish` — Publish paper for exams.
- `PATCH /api/question-papers/:id/archive` — Archive paper.

### Recruitment Drives (Requires `admin` or `superadmin` role)
- `GET /api/drives` — List drives with candidate counts.
- `GET /api/drives/:id` — Drive details.
- `GET /api/drives/:id/students` — Registered students for drive.
- `POST /api/drives` — Create drive with unique access code.
- `PUT /api/drives/:id` — Update drive parameters.
- `POST /api/drives/:id/regenerate-code` — Regenerate access code.

### Examination & Results
- `POST /api/drive-registrations/join` — Student join drive with code.
- `GET /api/drive-registrations/my-drives` — Student's registered drives.
- `GET /api/exams/instructions/:driveId` — Pre-exam rules & attempt check.
- `POST /api/exams/start/:driveId` — Start or resume timed attempt.
- `GET /api/exams/attempt/:attemptId` — Active attempt state & questions (answers masked).
- `POST /api/exams/save-answers/:attemptId` — Auto-save draft answers.
- `POST /api/exams/submit/:attemptId` — Submit and evaluate exam score.
- `GET /api/results/drive/:driveId` — Admin view results for drive.
- `GET /api/results/attempt/:attemptId` — Admin inspect candidate answer sheet.

### Candidate Pipeline (Requires `admin` or `superadmin` role)
- `GET /api/candidates/drive/:driveId` — Candidates in recruitment pipeline.
- `POST /api/candidates/shortlist` — Shortlist candidate for next round.
- `PUT /api/candidates/update-stage` — Update round status, schedule interview date/time/link, score, notes.

### Student Portal (Requires `student` role)
- `GET /api/student/dashboard` — Student metrics & active exam alerts.
- `GET /api/student/history` — Full exam history.
- `GET /api/student/progress/:driveId` — Student view own candidate progress and schedule.

---

## 8. Render Deployment Preparation (Future Phase)

When deploying to Render:
1. **Database**: Use a cloud-hosted MongoDB Atlas cluster (e.g. `mongodb+srv://<user>:<password>@cluster0.mongodb.net/hiring_platform`).
2. **Backend Web Service on Render**:
   - Root directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `NODE_ENV=production`
     - `PORT=5000`
     - `MONGODB_URI=<Your MongoDB Atlas Connection String>`
     - `JWT_SECRET=<Strong 32+ character random secret>`
     - `JWT_EXPIRES_IN=30m`
     - `CLIENT_URL=https://your-frontend-app.onrender.com`
3. **Frontend Static Site on Render**:
   - Root directory: `client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL=https://your-backend-api.onrender.com/api`
   - Add a rewrite rule for Single Page Applications: `/*` -> `/index.html` (HTTP 200).
