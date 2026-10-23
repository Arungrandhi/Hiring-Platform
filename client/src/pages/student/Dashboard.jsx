import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Briefcase,
  FileCheck2,
  Award,
  KeyRound,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Video,
} from 'lucide-react';

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/student/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch student dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner text="Loading candidate dashboard..." />;

  const stats = data?.stats || {};
  const activeAttempt = data?.activeAttempt;
  const joinedDrives = data?.joinedDrives || [];
  const candidateProgresses = data?.candidateProgresses || [];

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Student Candidate Dashboard</h2>
          <p className="text-muted small mb-0">Track your recruitment drives, examinations, and interview round updates</p>
        </div>
        <Link to="/student/join-drive" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <KeyRound size={18} /> Join Recruitment Drive with Code
        </Link>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {/* Ongoing / Active Exam Alert Banner */}
      {activeAttempt && (
        <div className="alert alert-warning border-warning d-flex flex-wrap align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-warning text-dark rounded-circle">
              <Clock size={24} />
            </div>
            <div>
              <h6 className="fw-bold mb-0">You Have an In-Progress Examination!</h6>
              <div className="small text-muted">
                Your examination attempt for {activeAttempt.drive?.name || 'Recruitment Drive'} is currently active.
              </div>
            </div>
          </div>
          <Link to={`/student/exam/${activeAttempt._id}`} className="btn btn-warning fw-semibold mt-2 mt-sm-0">
            Resume Examination &rarr;
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-4">
          <div className="stats-card">
            <div className="stats-icon-wrapper bg-primary-subtle text-primary">
              <Briefcase size={24} />
            </div>
            <div>
              <div className="text-muted small">Joined Drives</div>
              <div className="fs-4 fw-bold">{stats.totalJoinedDrives || 0}</div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-md-4">
          <Link to="/student/history" className="text-decoration-none">
            <div className="stats-card">
              <div className="stats-icon-wrapper bg-info-subtle text-info">
                <FileCheck2 size={24} />
              </div>
              <div>
                <div className="text-muted small">Exams Completed</div>
                <div className="fs-4 fw-bold text-dark">{stats.totalExamsTaken || 0}</div>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-sm-6 col-md-4">
          <Link to="/student/history" className="text-decoration-none">
            <div className="stats-card">
              <div className="stats-icon-wrapper bg-success-subtle text-success">
                <Award size={24} />
              </div>
              <div>
                <div className="text-muted small">Qualified Assessments</div>
                <div className="fs-4 fw-bold text-dark">{stats.qualifiedExams || 0}</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Grid: Joined Drives & Recruitment Progress */}
      <div className="row g-4">
        {/* Joined Drives */}
        <div className="col-lg-7">
          <div className="card custom-card">
            <div className="card-header card-header-clean d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Briefcase size={18} className="text-primary" /> My Recruitment Drives
              </h5>
              <Link to="/student/my-drives" className="text-primary small text-decoration-none fw-semibold">
                View All &rarr;
              </Link>
            </div>
            <div className="card-body p-0">
              {joinedDrives.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted small mb-3">You have not joined any recruitment drives yet.</p>
                  <Link to="/student/join-drive" className="btn btn-sm btn-primary-custom">
                    Enter Drive Access Code
                  </Link>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {joinedDrives.map((reg) => {
                    const drive = reg.drive;
                    if (!drive) return null;

                    return (
                      <div key={reg._id} className="list-group-item p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <h6 className="fw-bold mb-0">{drive.name}</h6>
                            <span className={`badge-custom badge-${drive.status}`}>{drive.status}</span>
                          </div>
                          <div className="text-muted small">
                            Role: <span className="text-dark fw-medium">{drive.jobTitle}</span> | Duration: {drive.totalDuration} mins
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Drive Code: <span className="font-monospace text-dark fw-bold">{drive.driveCode}</span>
                          </div>
                        </div>

                        <div>
                          <Link to={`/student/exam-instructions/${drive._id}`} className="btn btn-sm btn-primary-custom">
                            Take Exam
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recruitment Progress Updates */}
        <div className="col-lg-5">
          <div className="card custom-card">
            <div className="card-header card-header-clean d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Award size={18} className="text-success" /> Recruitment Pipeline Updates
              </h5>
            </div>
            <div className="card-body p-3">
              {candidateProgresses.length === 0 ? (
                <p className="text-muted small text-center py-4 mb-0">No active recruitment pipeline updates.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {candidateProgresses.map((cp) => {
                    const activeEval = cp.roundEvaluations?.find((r) => r.stageName === cp.currentStage);

                    return (
                      <div key={cp._id} className="p-3 bg-light rounded-3 border">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="fw-bold mb-0">{cp.drive?.name || 'Recruitment Drive'}</h6>
                          <span className={`badge-custom badge-${cp.overallStatus}`}>
                            {cp.overallStatus}
                          </span>
                        </div>

                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="small text-muted">Current Stage:</span>
                          <span className="badge bg-primary text-white fw-semibold">
                            {cp.currentStage}
                          </span>
                        </div>

                        {activeEval?.interviewDate && (
                          <div className="small p-2 bg-white rounded-2 border mb-2">
                            <div className="text-muted d-flex align-items-center gap-1">
                              <Calendar size={13} /> Date: <strong>{new Date(activeEval.interviewDate).toLocaleDateString()}</strong>
                            </div>
                            {activeEval.interviewTime && (
                              <div className="text-muted d-flex align-items-center gap-1">
                                <Clock size={13} /> Time: <strong>{activeEval.interviewTime}</strong>
                              </div>
                            )}
                            {activeEval.locationOrLink && (
                              <div className="mt-1">
                                <a
                                  href={activeEval.locationOrLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-primary py-0 px-2"
                                >
                                  <Video size={12} className="me-1" /> Open Meeting Link
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {activeEval?.candidateNotes && (
                          <div className="small text-muted mb-2">
                            <strong>Note:</strong> {activeEval.candidateNotes}
                          </div>
                        )}

                        <div className="text-end">
                          <Link to={`/student/progress/${cp.drive?._id}`} className="small text-primary text-decoration-none fw-semibold">
                            View Round Details &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
