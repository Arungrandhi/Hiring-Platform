import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  FileCheck,
  Activity,
  UserPlus,
  ArrowRight,
  Clock,
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/superadmin/stats');
      if (res.data.success) {
        setStats(res.data.stats);
        setRecentActivities(res.data.recentActivities);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner text="Loading Super Admin metrics..." />;

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Super Admin Overview</h2>
          <p className="text-muted small mb-0">Platform governance, administrative accounts, and activity telemetry</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/superadmin/admins/create" className="btn btn-primary-custom d-flex align-items-center gap-2">
            <UserPlus size={18} /> Create New Admin
          </Link>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {/* Summary Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-4 col-xl-2">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-primary-subtle text-primary">
              <Users size={24} />
            </div>
            <div>
              <div className="text-muted small">Total Admins</div>
              <div className="fs-4 fw-bold">{stats?.totalAdmins || 0}</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-4 col-xl-2">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-success-subtle text-success">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-muted small">Active Admins</div>
              <div className="fs-4 fw-bold">{stats?.activeAdmins || 0}</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-4 col-xl-2">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-info-subtle text-info">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="text-muted small">Total Students</div>
              <div className="fs-4 fw-bold">{stats?.totalStudents || 0}</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-4 col-xl-3">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-warning-subtle text-warning">
              <Briefcase size={24} />
            </div>
            <div>
              <div className="text-muted small">Recruitment Drives</div>
              <div className="fs-4 fw-bold">{stats?.totalDrives || 0}</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-4 col-xl-3">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-purple-subtle text-purple" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
              <FileCheck size={24} />
            </div>
            <div>
              <div className="text-muted small">Total Exam Attempts</div>
              <div className="fs-4 fw-bold">{stats?.totalAttempts || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="row g-4">
        {/* Recent Activity Log Feed */}
        <div className="col-lg-8">
          <div className="card custom-card">
            <div className="card-header card-header-clean d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <Activity size={18} className="text-primary" />
                <span>Recent Platform Activities</span>
              </div>
              <Link to="/superadmin/activities" className="text-primary small text-decoration-none fw-semibold">
                View Full Audit Trail &rarr;
              </Link>
            </div>
            <div className="card-body p-0">
              {recentActivities.length === 0 ? (
                <div className="text-center py-5 text-muted small">No recent platform activities recorded.</div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentActivities.map((act) => (
                    <div key={act._id} className="list-group-item px-4 py-3 d-flex justify-content-between align-items-start">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-secondary-subtle text-secondary small" style={{ fontSize: '0.7rem' }}>
                            {act.action}
                          </span>
                          <span className="fw-semibold text-dark small">{act.actorName}</span>
                          <span className="text-muted small">({act.actorRole})</span>
                        </div>
                        <div className="text-muted small">
                          Resource: <span className="fw-medium text-dark">{act.resourceType}</span>
                          {act.metadata && Object.keys(act.metadata).length > 0 && (
                            <span className="ms-2 text-secondary font-monospace" style={{ fontSize: '0.75rem' }}>
                              {JSON.stringify(act.metadata).substring(0, 80)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-muted small text-nowrap d-flex align-items-center gap-1">
                        <Clock size={13} />
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="col-lg-4">
          <div className="card custom-card p-4">
            <h5 className="fw-bold mb-3">Governance Shortcuts</h5>
            <div className="d-flex flex-column gap-3">
              <Link to="/superadmin/admins" className="p-3 rounded-3 border text-decoration-none d-flex justify-content-between align-items-center text-dark hover-bg-light">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 bg-primary-subtle text-primary rounded-3">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="fw-semibold small">Manage Admin Accounts</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Active status, resets, drives</div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted" />
              </Link>

              <Link to="/superadmin/admins/create" className="p-3 rounded-3 border text-decoration-none d-flex justify-content-between align-items-center text-dark hover-bg-light">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 bg-success-subtle text-success rounded-3">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <div className="fw-semibold small">Provision Admin</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Create recruiter credential</div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted" />
              </Link>

              <Link to="/superadmin/activities" className="p-3 rounded-3 border text-decoration-none d-flex justify-content-between align-items-center text-dark hover-bg-light">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 bg-info-subtle text-info rounded-3">
                    <Activity size={20} />
                  </div>
                  <div>
                    <div className="fw-semibold small">Audit Log Stream</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>All actions & IP tracking</div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
