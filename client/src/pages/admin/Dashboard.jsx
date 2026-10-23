import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  BookOpen,
  FileText,
  Briefcase,
  Users,
  PlusCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    subjectsCount: 0,
    papersCount: 0,
    drivesCount: 0,
    candidatesCount: 0,
  });
  const [recentDrives, setRecentDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [subjectsRes, papersRes, drivesRes] = await Promise.all([
        axiosClient.get('/subjects', { params: { limit: 1 } }),
        axiosClient.get('/question-papers', { params: { limit: 1 } }),
        axiosClient.get('/drives', { params: { limit: 5 } }),
      ]);

      setStats({
        subjectsCount: subjectsRes.data.pagination?.total || 0,
        papersCount: papersRes.data.pagination?.total || 0,
        drivesCount: drivesRes.data.pagination?.total || 0,
        candidatesCount: drivesRes.data.drives?.reduce((sum, d) => sum + (d.stats?.registeredCandidates || 0), 0) || 0,
      });

      setRecentDrives(drivesRes.data.drives || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load recruitment dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner text="Loading recruitment management dashboard..." />;

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Recruiter Dashboard</h2>
          <p className="text-muted small mb-0">Manage subject assessments, recruitment drives, examinations, and candidate shortlisting</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/admin/question-papers/create" className="btn btn-outline-custom d-flex align-items-center gap-1">
            <PlusCircle size={16} /> New Question Paper
          </Link>
          <Link to="/admin/drives/create" className="btn btn-primary-custom d-flex align-items-center gap-1">
            <PlusCircle size={16} /> Create Recruitment Drive
          </Link>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {/* Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-primary-subtle text-primary">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="text-muted small">Subjects</div>
              <div className="fs-4 fw-bold">{stats.subjectsCount}</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-info-subtle text-info">
              <FileText size={24} />
            </div>
            <div>
              <div className="text-muted small">Question Papers</div>
              <div className="fs-4 fw-bold">{stats.papersCount}</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-warning-subtle text-warning">
              <Briefcase size={24} />
            </div>
            <div>
              <div className="text-muted small">Recruitment Drives</div>
              <div className="fs-4 fw-bold">{stats.drivesCount}</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-success-subtle text-success">
              <Users size={24} />
            </div>
            <div>
              <div className="text-muted small">Total Candidates</div>
              <div className="fs-4 fw-bold">{stats.candidatesCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch & Recent Drives */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card custom-card">
            <div className="card-header card-header-clean d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <Briefcase size={18} className="text-primary" />
                <span>Active Recruitment Drives</span>
              </div>
              <Link to="/admin/drives" className="text-primary small text-decoration-none fw-semibold">
                View All Drives &rarr;
              </Link>
            </div>
            <div className="card-body p-0">
              {recentDrives.length === 0 ? (
                <div className="text-center py-5 text-muted small">
                  No recruitment drives created yet.{' '}
                  <Link to="/admin/drives/create" className="text-primary">
                    Create your first drive
                  </Link>
                  .
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentDrives.map((drive) => (
                    <div key={drive._id} className="list-group-item p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h6 className="fw-bold mb-0">{drive.name}</h6>
                          <span className={`badge-custom badge-${drive.status}`}>{drive.status}</span>
                        </div>
                        <div className="text-muted small">
                          Role: <span className="text-dark fw-medium">{drive.jobTitle}</span> | Drive Code:{' '}
                          <span className="badge bg-light text-dark font-monospace border">{drive.driveCode}</span>
                        </div>
                        <div className="text-muted small mt-1">
                          Candidates: <strong>{drive.stats?.registeredCandidates || 0}</strong> | Attempts:{' '}
                          <strong>{drive.stats?.totalAttempts || 0}</strong> | Shortlisted:{' '}
                          <strong className="text-primary">{drive.stats?.shortlistedCandidates || 0}</strong>
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <Link to={`/admin/results/${drive._id}`} className="btn btn-sm btn-outline-custom">
                          Results
                        </Link>
                        <Link to={`/admin/candidates?driveId=${drive._id}`} className="btn btn-sm btn-primary-custom">
                          Pipeline
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Workflows Column */}
        <div className="col-lg-4">
          <div className="card custom-card p-4">
            <h5 className="fw-bold mb-3">Recruitment Workflow Guide</h5>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex gap-3 align-items-start">
                <div className="step-circle completed">1</div>
                <div>
                  <div className="fw-semibold small">Define Subjects</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Create categorized subjects (e.g. Full Stack, DSA)</div>
                </div>
              </div>

              <div className="d-flex gap-3 align-items-start">
                <div className="step-circle completed">2</div>
                <div>
                  <div className="fw-semibold small">Author & Publish Papers</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Add MCQs, negative marking, and publish</div>
                </div>
              </div>

              <div className="d-flex gap-3 align-items-start">
                <div className="step-circle current">3</div>
                <div>
                  <div className="fw-semibold small">Launch Recruitment Drive</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Generate unique drive code & share with candidates</div>
                </div>
              </div>

              <div className="d-flex gap-3 align-items-start">
                <div className="step-circle">4</div>
                <div>
                  <div className="fw-semibold small">Evaluate & Shortlist</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Review scores, pass/fail, and advance to GD/Tech/HR rounds</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
