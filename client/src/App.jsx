import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, matchPath } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import AdminList from './pages/superadmin/AdminList';
import CreateAdmin from './pages/superadmin/CreateAdmin';
import ActivityLogs from './pages/superadmin/ActivityLogs';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import Subjects from './pages/admin/Subjects';
import QuestionPapers from './pages/admin/QuestionPapers';
import QuestionPaperEditor from './pages/admin/QuestionPaperEditor';
import QuestionPaperPreview from './pages/admin/QuestionPaperPreview';
import RecruitmentDrives from './pages/admin/RecruitmentDrives';
import DriveEditor from './pages/admin/DriveEditor';
import DriveDetails from './pages/admin/DriveDetails';
import DriveResults from './pages/admin/DriveResults';
import CandidatesPipeline from './pages/admin/CandidatesPipeline';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import JoinDrive from './pages/student/JoinDrive';
import JoinedDrives from './pages/student/JoinedDrives';
import ExamInstructions from './pages/student/ExamInstructions';
import ExamRunner from './pages/student/ExamRunner';
import ExamResult from './pages/student/ExamResult';
import ExamHistory from './pages/student/ExamHistory';
import RecruitmentProgress from './pages/student/RecruitmentProgress';

function AppContent() {
  const location = useLocation();
  const isExamRunning =
    Boolean(matchPath('/student/exam/:attemptId', location.pathname)) ||
    location.pathname.startsWith('/student/exam/');

  return (
    <div className="d-flex flex-column min-vh-100">
      {!isExamRunning && <Navbar />}
      <main className={isExamRunning ? 'flex-grow-1' : 'main-content'}>
        <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Shared Authenticated Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Super Admin Routes */}
              <Route
                path="/superadmin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/admins"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <AdminList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/admins/create"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <CreateAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/activities"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <ActivityLogs />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/subjects"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <Subjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/question-papers"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <QuestionPapers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/question-papers/create"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <QuestionPaperEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/question-papers/edit/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <QuestionPaperEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/question-papers/preview/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <QuestionPaperPreview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drives"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <RecruitmentDrives />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drives/create"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <DriveEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drives/edit/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <DriveEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drives/:id/details"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <DriveDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/results/:driveId"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <DriveResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/candidates"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <CandidatesPipeline />
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/join-drive"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <JoinDrive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/my-drives"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <JoinedDrives />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exam-instructions/:driveId"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <ExamInstructions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exam/:attemptId"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <ExamRunner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exam-result/:attemptId"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <ExamResult />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/history"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <ExamHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/progress/:driveId"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <RecruitmentProgress />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          {!isExamRunning && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
