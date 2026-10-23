import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Briefcase,
  Plus,
  Search,
  Copy,
  RefreshCw,
  Check,
  Users,
  Eye,
  FileCheck2,
  Calendar,
  Layers,
  KeyRound,
  Lock,
} from 'lucide-react';

const RecruitmentDrives = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Regenerate Code Modal State
  const [regenerateDrive, setRegenerateDrive] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [togglingKeyId, setTogglingKeyId] = useState(null);

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/drives', {
        params: { search, status: statusFilter },
      });
      if (res.data.success) {
        setDrives(res.data.drives);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch recruitment drives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDrives();
  };

  const handleTogglePublishKey = async (drive) => {
    try {
      setTogglingKeyId(drive._id);
      setError('');
      setSuccess('');
      const targetState = !drive.isExamKeyPublished;
      const res = await axiosClient.patch(`/drives/${drive._id}/publish-key`, {
        publish: targetState,
      });
      if (res.data.success) {
        setSuccess(res.data.message);
        setDrives((prev) =>
          prev.map((d) =>
            d._id === drive._id
              ? { ...d, isExamKeyPublished: res.data.isExamKeyPublished, examKeyPublishedAt: res.data.examKeyPublishedAt }
              : d
          )
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update exam key status');
    } finally {
      setTogglingKeyId(null);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleRegenerateCode = async () => {
    if (!regenerateDrive) return;
    try {
      setRegenerating(true);
      setError('');
      const res = await axiosClient.post(`/drives/${regenerateDrive._id}/regenerate-code`);
      if (res.data.success) {
        setSuccess(`Drive code regenerated to: ${res.data.driveCode}`);
        setRegenerateDrive(null);
        fetchDrives();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to regenerate drive code');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Recruitment Drives</h2>
          <p className="text-muted small mb-0">Manage drives, unique student access codes, assessments, and round pipelines</p>
        </div>
        <Link to="/admin/drives/create" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <Plus size={18} /> Create Recruitment Drive
        </Link>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} type="danger" />
      <AlertMessage message={success} onClose={() => setSuccess('')} type="success" />

      {/* Filter / Search Bar */}
      <div className="card custom-card p-3 mb-4">
        <form onSubmit={handleSearch} className="row g-2 align-items-center">
          <div className="col-md-6 col-lg-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search drives by name, job title, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4 col-lg-3">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="col-auto">
            <button type="submit" className="btn btn-outline-custom">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Drives Grid / Cards */}
      {loading ? (
        <LoadingSpinner text="Fetching recruitment drives..." />
      ) : drives.length === 0 ? (
        <div className="card custom-card text-center py-5">
          <p className="text-muted mb-3">No recruitment drives created yet.</p>
          <div>
            <Link to="/admin/drives/create" className="btn btn-primary-custom">
              Launch Your First Recruitment Drive
            </Link>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {drives.map((drive) => (
            <div key={drive._id} className="card custom-card p-4">
              <div className="row align-items-center g-3">
                <div className="col-lg-5">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h5 className="fw-bold text-dark mb-0">{drive.name}</h5>
                    <span className={`badge-custom badge-${drive.status}`}>{drive.status}</span>
                  </div>
                  <div className="text-muted small mb-1">
                    Role: <span className="text-dark fw-semibold">{drive.jobTitle}</span>
                  </div>

                  <div className="mb-2">
                    {drive.isExamKeyPublished ? (
                      <span className="badge bg-success-subtle text-success border border-success d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <Check size={11} /> Exam Key Published
                      </span>
                    ) : (
                      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <Lock size={11} /> Key Hidden from Students
                      </span>
                    )}
                  </div>

                  {/* Drive Access Code Badge */}
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <span className="small text-muted fw-semibold">Access Code:</span>
                    <span className="badge bg-light text-primary border font-monospace fs-6 px-3 py-1">
                      {drive.driveCode}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-custom p-1 px-2 d-flex align-items-center gap-1"
                      title="Copy code to clipboard"
                      onClick={() => handleCopyCode(drive.driveCode)}
                    >
                      {copiedCode === drive.driveCode ? (
                        <>
                          <Check size={14} className="text-success" /> <span className="small text-success">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> <span className="small">Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary p-1"
                      title="Regenerate Access Code"
                      onClick={() => setRegenerateDrive(drive)}
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                {/* Candidate Statistics */}
                <div className="col-lg-4">
                  <div className="d-flex flex-wrap gap-2 text-center">
                    <div className="p-2 bg-light rounded-3 flex-fill">
                      <div className="fs-5 fw-bold text-dark">{drive.stats?.registeredCandidates || 0}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>Registered</div>
                    </div>
                    <div className="p-2 bg-light rounded-3 flex-fill">
                      <div className="fs-5 fw-bold text-dark">{drive.stats?.totalAttempts || 0}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>Attempts</div>
                    </div>
                    <div className="p-2 bg-light rounded-3 flex-fill">
                      <div className="fs-5 fw-bold text-success">{drive.stats?.qualifiedCandidates || 0}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>Passed</div>
                    </div>
                    <div className="p-2 bg-light rounded-3 flex-fill">
                      <div className="fs-5 fw-bold text-primary">{drive.stats?.shortlistedCandidates || 0}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>Shortlisted</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="col-lg-3 text-lg-end">
                  <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm d-flex align-items-center gap-1 ${
                        drive.isExamKeyPublished ? 'btn-outline-warning' : 'btn-outline-success'
                      }`}
                      onClick={() => handleTogglePublishKey(drive)}
                      disabled={togglingKeyId === drive._id}
                      title={drive.isExamKeyPublished ? 'Unpublish exam key' : 'Publish exam key & results'}
                    >
                      <KeyRound size={14} />
                      {togglingKeyId === drive._id ? 'Updating...' : drive.isExamKeyPublished ? 'Unpublish Key' : 'Publish Key'}
                    </button>
                    <Link
                      to={`/admin/drives/${drive._id}/details`}
                      className="btn btn-sm btn-outline-custom d-flex align-items-center gap-1"
                    >
                      <Users size={14} /> Candidates
                    </Link>
                    <Link
                      to={`/admin/results/${drive._id}`}
                      className="btn btn-sm btn-outline-custom d-flex align-items-center gap-1"
                    >
                      <FileCheck2 size={14} /> Exam Results
                    </Link>
                    <Link
                      to={`/admin/candidates?driveId=${drive._id}`}
                      className="btn btn-sm btn-primary-custom d-flex align-items-center gap-1"
                    >
                      <Layers size={14} /> Pipeline
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Regenerate Drive Code Confirmation Modal */}
      {regenerateDrive && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Regenerate Drive Code</h5>
                <button type="button" className="btn-close" onClick={() => setRegenerateDrive(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small">
                  Are you sure you want to regenerate the unique access code for{' '}
                  <strong>{regenerateDrive.name}</strong>?
                </p>
                <div className="alert alert-info py-2 small mb-0">
                  Existing candidate registrations, exam scores, and stage progression history will remain intact. Only newly joining students will need the new code.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setRegenerateDrive(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-warning" onClick={handleRegenerateCode} disabled={regenerating}>
                  {regenerating ? 'Regenerating...' : 'Regenerate Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentDrives;
