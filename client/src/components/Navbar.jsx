import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  BookOpen,
  FileText,
  Briefcase,
  Users,
  Activity,
  LogOut,
  User,
  LogIn,
  UserPlus,
  KeyRound,
  History,
  CheckCircle2,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg custom-navbar sticky-top">
      <div className="container-fluid px-lg-4">
        <Link to="/" className="brand-logo me-3">
          <Award size={26} className="text-primary flex-shrink-0" />
          <span>Saanvika Software Solutions</span>
        </Link>

        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1">
            {/* Super Admin Navigation */}
            {isAuthenticated && role === 'superadmin' && (
              <>
                <li className="nav-item">
                  <NavLink to="/superadmin/dashboard" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <Activity size={18} /> Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/superadmin/admins" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <Users size={18} /> Manage Admins
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/superadmin/activities" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <History size={18} /> Activity Logs
                  </NavLink>
                </li>
              </>
            )}

            {/* Admin Navigation */}
            {isAuthenticated && role === 'admin' && (
              <>
                <li className="nav-item">
                  <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <Activity size={18} /> Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/admin/subjects" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <BookOpen size={18} /> Subjects
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/admin/question-papers" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <FileText size={18} /> Question Papers
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/admin/drives" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <Briefcase size={18} /> Recruitment Drives
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/admin/candidates" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <Users size={18} /> Candidates & Pipeline
                  </NavLink>
                </li>
              </>
            )}

            {/* Student Navigation */}
            {isAuthenticated && role === 'student' && (
              <>
                <li className="nav-item">
                  <NavLink to="/student/dashboard" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <Activity size={18} /> Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/student/join-drive" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <KeyRound size={18} /> Join Drive
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/student/my-drives" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <Briefcase size={18} /> My Drives
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/student/history" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                    <History size={18} /> Exam History
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          {/* Right Authenticated / Guest Controls */}
          <div className="d-flex align-items-center gap-2 mt-3 mt-lg-0">
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-3">
                <Link to="/profile" className="d-flex align-items-center text-decoration-none text-dark gap-2">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="d-none d-md-block text-start">
                    <div className="fw-semibold text-truncate" style={{ maxWidth: 140, fontSize: '0.85rem' }}>
                      {user?.name}
                    </div>
                    <span className={`badge-custom badge-${role === 'superadmin' ? 'active' : role === 'admin' ? 'shortlisted' : 'scheduled'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      {role}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 rounded-pill px-3"
                  title="Logout"
                >
                  <LogOut size={15} />
                  <span className="d-none d-sm-inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <Link to="/login" className="btn btn-sm btn-outline-custom d-flex align-items-center gap-1 px-3">
                  <LogIn size={16} /> Sign In
                </Link>
                <Link to="/register" className="btn btn-sm btn-primary-custom d-flex align-items-center gap-1 px-3">
                  <UserPlus size={16} /> Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
