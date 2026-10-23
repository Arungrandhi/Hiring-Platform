import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Briefcase,
  Users,
  ArrowLeft,
  Copy,
  Check,
  FileCheck2,
  Layers,
  Search,
  KeyRound,
  Lock,
} from 'lucide-react';

const DriveDetails = () => {
  const { id } = useParams();
  const [drive, setDrive] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [togglingPublishKey, setTogglingPublishKey] = useState(false);

  useEffect(() => {
    const fetchDriveAndStudents = async () => {
      try {
        setLoading(true);
        const [driveRes, studentsRes] = await Promise.all([
          axiosClient.get(`/drives/${id}`),
          axiosClient.get(`/drives/${id}/students`),
        ]);

        if (driveRes.data.success) {
          setDrive(driveRes.data.drive);
        }
        if (studentsRes.data.success) {
          setStudents(studentsRes.data.students);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load drive details and registered students');
      } finally {
        setLoading(false);
      }
    };

    fetchDriveAndStudents();
  }, [id]);

  const handleCopyCode = () => {
    if (drive?.driveCode) {
      navigator.clipboard.writeText(drive.driveCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTogglePublishKey = async () => {
    try {
      setTogglingPublishKey(true);
      setError('');
      setSuccess('');
      const targetState = !drive?.isExamKeyPublished;
      const res = await axiosClient.patch(`/drives/${id}/publish-key`, {
        publish: targetState,
      });
      if (res.data.success) {
        setSuccess(res.data.message);
        setDrive((prev) => ({
          ...prev,
          isExamKeyPublished: res.data.isExamKeyPublished,
          examKeyPublishedAt: res.data.examKeyPublishedAt,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update exam key publication status');
    } finally {
      setTogglingPublishKey(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading drive details..." />;

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="mb-4">
        <Link to="/admin/drives" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-2">
          <ArrowLeft size={16} /> Back to Recruitment Drives
        </Link>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h2 className="fw-bold mb-1">{drive?.name}</h2>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className={`badge-custom badge-${drive?.status}`}>{drive?.status}</span>
              <span className="text-muted small">Role: <strong>{drive?.jobTitle}</strong></span>
              {drive?.isExamKeyPublished ? (
                <span className="badge bg-success-subtle text-success border border-success d-inline-flex align-items-center gap-1">
                  <Check size={12} /> Key Published
                </span>
              ) : (
                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning d-inline-flex align-items-center gap-1">
                  <Lock size={12} /> Key Unpublished
                </span>
              )}
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-1 ${
                drive?.isExamKeyPublished ? 'btn-outline-warning' : 'btn-success'
              }`}
              onClick={handleTogglePublishKey}
              disabled={togglingPublishKey}
            >
              <KeyRound size={15} />
              {togglingPublishKey
                ? 'Updating...'
                : drive?.isExamKeyPublished
                ? 'Unpublish Exam Key'
                : 'Publish Exam Key & Results'}
            </button>
            <Link to={`/admin/results/${drive?._id}`} className="btn btn-outline-custom btn-sm d-flex align-items-center gap-1">
              <FileCheck2 size={16} /> View Results
            </Link>
            <Link to={`/admin/candidates?driveId=${drive?._id}`} className="btn btn-primary-custom btn-sm d-flex align-items-center gap-1">
              <Layers size={16} /> Recruitment Pipeline
            </Link>
          </div>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} type="danger" />
      <AlertMessage message={success} onClose={() => setSuccess('')} type="success" />

      {/* Drive Summary Cards */}
      <div className="card custom-card p-4 mb-4">
        <div className="row g-3">
          <div className="col-md-3">
            <div className="text-muted small">Unique Access Code</div>
            <div className="d-flex align-items-center gap-2 mt-1">
              <span className="badge bg-light text-primary border font-monospace fs-6 px-3 py-1">
                {drive?.driveCode}
              </span>
              <button
                className="btn btn-sm btn-outline-custom p-1 px-2"
                onClick={handleCopyCode}
                title="Copy code"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="col-md-3">
            <div className="text-muted small">Duration & Attempts</div>
            <div className="fw-bold text-dark mt-1">
              {drive?.totalDuration} mins | Max {drive?.maxAttempts} Attempt(s)
            </div>
          </div>

          <div className="col-md-3">
            <div className="text-muted small">Exam Key Publication</div>
            <div className="mt-1">
              {drive?.isExamKeyPublished ? (
                <span className="badge bg-success-subtle text-success border border-success">
                  Published (Scores & History Live)
                </span>
              ) : (
                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning">
                  Unpublished (Scores & History Hidden)
                </span>
              )}
            </div>
          </div>

          <div className="col-md-3">
            <div className="text-muted small">Candidates Registered</div>
            <div className="fs-5 fw-bold text-primary mt-1">
              {students.length} Candidates
            </div>
          </div>
        </div>
      </div>

      {/* Registered Candidates Table */}
      <div className="card custom-card overflow-hidden">
        <div className="card-header card-header-clean d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <Users size={18} className="text-primary" /> Registered Students ({students.length})
          </h5>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-5 text-muted small">
            No candidates have registered for this recruitment drive yet. Share the code{' '}
            <strong className="text-primary font-monospace">{drive?.driveCode}</strong> with students.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Student Candidate</th>
                  <th className="py-3">Institution & Degree</th>
                  <th className="py-3">Joined Date</th>
                  <th className="py-3">Exam Status & Score</th>
                  <th className="py-3">Current Round</th>
                  <th className="py-3 text-end px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((reg) => {
                  const student = reg.student;
                  const attempt = reg.examAttempt;
                  const progress = reg.candidateProgress;

                  return (
                    <tr key={reg._id}>
                      <td className="px-4 py-3">
                        <div className="fw-semibold text-dark">{student?.name}</div>
                        <div className="text-muted small">{student?.email}</div>
                      </td>
                      <td className="py-3 text-muted small">
                        <div>{student?.profile?.college || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem' }}>{student?.profile?.qualification || '-'}</div>
                      </td>
                      <td className="py-3 text-muted small">
                        {new Date(reg.registeredAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {attempt ? (
                          <div>
                            <span className={`badge-custom badge-${attempt.isPassed ? 'passed' : 'rejected'}`}>
                              {attempt.isPassed ? 'Passed' : 'Failed'} ({attempt.score}/{attempt.totalMarks})
                            </span>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {attempt.percentage}% | {attempt.submissionStatus}
                            </div>
                          </div>
                        ) : (
                          <span className="badge-custom badge-pending">Not Attempted</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="badge bg-light text-dark border">
                          {progress?.currentStage || 'Examination'}
                        </span>
                      </td>
                      <td className="py-3 text-end px-4">
                        <Link
                          to={`/admin/candidates?driveId=${drive._id}&studentId=${student?._id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Manage Round
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriveDetails;
