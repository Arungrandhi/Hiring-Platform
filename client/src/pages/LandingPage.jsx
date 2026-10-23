import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AOS from 'aos';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  ShieldCheck,
  Zap,
  Users,
  BookOpen,
  ArrowRight,
  KeyRound,
  FileCheck2,
  Lock,
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    AOS.init({ duration: 600, once: true });
  }, []);

  const getDashboardPath = () => {
    if (role === 'superadmin') return '/superadmin/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/student/dashboard';
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="py-5 bg-white border-bottom">
        <div className="container py-lg-4">
          <div className="row align-items-center g-5">
            <div className="col-lg-7" data-aos="fade-up">
              <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-2 rounded-pill mb-3">
                Saanvika Software Solutions Recruitment & Examination Portal
              </span>
              <h1 className="display-4 fw-extrabold text-dark tracking-tight mb-3">
                Secure Hiring, Automated Assessment & Candidate Progression
              </h1>
              <p className="lead text-secondary mb-4">
                The official recruitment and examination platform for Saanvika Software Solutions. Powering Subject-wise Question Papers, timed cheat-resistant online examinations, unique access-code recruitment drives, and a 6-stage candidate progression pipeline.
              </p>

              <div className="d-flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <Link to={getDashboardPath()} className="btn btn-primary-custom btn-lg d-inline-flex align-items-center gap-2">
                    Go to Your Dashboard <ArrowRight size={20} />
                  </Link>
                ) : (
                  <>
                    <Link to="/student/join-drive" className="btn btn-primary-custom btn-lg d-inline-flex align-items-center gap-2">
                      <KeyRound size={20} /> Join Recruitment Drive
                    </Link>
                    <Link to="/login" className="btn btn-outline-custom btn-lg d-inline-flex align-items-center gap-2">
                      Sign In to Portal
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="col-lg-5" data-aos="fade-left">
              {/* Quick Demo Access Card */}
              <div className="card custom-card border-0 shadow-sm p-4 bg-light">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Lock size={20} className="text-primary" />
                  <h5 className="fw-bold mb-0">Pre-Configured Demo Credentials</h5>
                </div>
                <p className="small text-muted mb-3">
                  Click any role to test workflows instantly or log in with the seeded accounts:
                </p>

                <div className="d-flex flex-column gap-2">
                  <div className="p-3 bg-white rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge-custom badge-active">Super Admin</span>
                      <small className="text-muted">Platform Overseer</small>
                    </div>
                    <div className="small text-dark font-monospace">superadmin@hiringplatform.com</div>
                    <div className="small text-muted">Pass: SuperAdmin@123</div>
                  </div>

                  <div className="p-3 bg-white rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge-custom badge-shortlisted">Admin</span>
                      <small className="text-muted">Drives & Exams</small>
                    </div>
                    <div className="small text-dark font-monospace">admin@techcorp.com</div>
                    <div className="small text-muted">Pass: Admin@123</div>
                  </div>

                  <div className="p-3 bg-white rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge-custom badge-scheduled">Student</span>
                      <small className="text-muted">Drive Code Candidate</small>
                    </div>
                    <div className="small text-dark font-monospace">student@example.com</div>
                    <div className="small text-muted">Pass: Student@123 | Code: <strong>HIRE-TECH26</strong></div>
                  </div>
                </div>

                <Link to="/login" className="btn btn-outline-primary btn-sm mt-3 w-100">
                  Proceed to Login Screen &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-5">
        <div className="container py-4">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="fw-bold">Platform Capabilities & Role Architecture</h2>
            <p className="text-muted">Engineered for Saanvika Software Solutions recruitment drives, security, and scalable performance</p>
          </div>

          <div className="row g-4">
            <div className="col-md-4" data-aos="fade-up" data-aos-delay="100">
              <div className="custom-card p-4 h-100">
                <div className="stats-icon-wrapper bg-primary-subtle text-primary mb-3">
                  <ShieldCheck size={26} />
                </div>
                <h5 className="fw-bold">Super Admin Governance</h5>
                <p className="text-muted small">
                  Complete admin account provisioning, activation controls, password resets, and real-time activity audit trails tracking all administrative actions.
                </p>
              </div>
            </div>

            <div className="col-md-4" data-aos="fade-up" data-aos-delay="200">
              <div className="custom-card p-4 h-100">
                <div className="stats-icon-wrapper bg-success-subtle text-success mb-3">
                  <Zap size={26} />
                </div>
                <h5 className="fw-bold">Admin Recruitment Engine</h5>
                <p className="text-muted small">
                  Author subject-wise question papers, configure negative marking, generate unique drive access codes (e.g. HIRE-TECH26), and manage candidate progression.
                </p>
              </div>
            </div>

            <div className="col-md-4" data-aos="fade-up" data-aos-delay="300">
              <div className="custom-card p-4 h-100">
                <div className="stats-icon-wrapper bg-info-subtle text-info mb-3">
                  <FileCheck2 size={26} />
                </div>
                <h5 className="fw-bold">Secure Timed Examination</h5>
                <p className="text-muted small">
                  Answer keys are securely masked on the server. Features client palette navigation, draft persistence, automatic submission on deadline, and instant scoring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
