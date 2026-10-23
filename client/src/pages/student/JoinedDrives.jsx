import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import { Briefcase, KeyRound, PlayCircle, Clock, CheckCircle, ArrowRight, FileCheck2 } from 'lucide-react';

const JoinedDrives = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/drive-registrations/my-drives');
      if (res.data.success) {
        setRegistrations(res.data.registrations);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch registered recruitment drives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  if (loading) return <LoadingSpinner text="Fetching your registered drives..." />;

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">My Registered Recruitment Drives</h2>
          <p className="text-muted small mb-0">Manage exam attempts and track multi-round recruitment status</p>
        </div>
        <Link to="/student/join-drive" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <KeyRound size={18} /> Join Another Drive
        </Link>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {registrations.length === 0 ? (
        <div className="card custom-card text-center py-5">
          <p className="text-muted mb-3">You have not registered for any recruitment drives yet.</p>
          <div>
            <Link to="/student/join-drive" className="btn btn-primary-custom">
              Enter Recruitment Drive Access Code
            </Link>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {registrations.map((reg) => {
            const drive = reg.drive;
            const attempt = reg.latestAttempt;
            const progress = reg.candidateProgress;

            if (!drive) return null;

            const isExamInProgress = attempt?.submissionStatus === 'in-progress';
            const isExamCompleted = attempt?.submissionStatus === 'submitted' || attempt?.submissionStatus === 'auto-submitted';

            return (
              <div key={reg._id} className="card custom-card p-4">
                <div className="row align-items-center g-3">
                  <div className="col-lg-5">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h5 className="fw-bold text-dark mb-0">{drive.name}</h5>
                      <span className={`badge-custom badge-${drive.status}`}>{drive.status}</span>
                    </div>
                    <div className="text-muted small mb-2">
                      Role: <strong className="text-dark">{drive.jobTitle}</strong>
                    </div>
                    <div className="text-muted small">
                      Duration: {drive.totalDuration} mins | Passing: {drive.passingCriteria?.minPercentage}%
                    </div>
                  </div>

                  {/* Exam & Pipeline Progress */}
                  <div className="col-lg-4">
                    <div className="d-flex flex-column gap-1">
                      <div className="d-flex align-items-center gap-2">
                        <span className="small text-muted">Examination:</span>
                        {isExamInProgress ? (
                          <span className="badge bg-warning text-dark">In Progress</span>
                        ) : isExamCompleted ? (
                          attempt.isExamKeyPublished ? (
                            <span className={`badge-custom badge-${attempt.isPassed ? 'passed' : 'rejected'}`}>
                              {attempt.isPassed ? 'Passed' : 'Failed'} ({attempt.score}/{attempt.totalMarks})
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                              Exam Submitted (Key Pending)
                            </span>
                          )
                        ) : (
                          <span className="badge-custom badge-pending">Pending Attempt</span>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <span className="small text-muted">Recruitment Stage:</span>
                        <span className="badge bg-primary text-white fw-semibold">
                          {progress?.currentStage || 'Examination'}
                        </span>
                        <span className={`badge-custom badge-${progress?.overallStatus || 'pending'}`}>
                          {progress?.overallStatus || 'pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-lg-3 text-lg-end">
                    <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                      {isExamInProgress ? (
                        <Link to={`/student/exam/${attempt._id}`} className="btn btn-warning btn-sm d-flex align-items-center gap-1">
                          <PlayCircle size={15} /> Resume Exam
                        </Link>
                      ) : !isExamCompleted ? (
                        <Link to={`/student/exam-instructions/${drive._id}`} className="btn btn-primary-custom btn-sm d-flex align-items-center gap-1">
                          <PlayCircle size={15} /> Start Exam
                        </Link>
                      ) : attempt.isExamKeyPublished ? (
                        <Link to={`/student/exam-result/${attempt._id}`} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
                          <FileCheck2 size={15} /> Review & Key
                        </Link>
                      ) : (
                        <Link to={`/student/exam-result/${attempt._id}`} className="btn btn-outline-secondary btn-sm">
                          Submission Status
                        </Link>
                      )}

                      <Link to={`/student/progress/${drive._id}`} className="btn btn-outline-primary btn-sm">
                        View Pipeline
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JoinedDrives;
