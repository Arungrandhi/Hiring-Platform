import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  FileCheck2,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Check,
  Award,
  KeyRound,
  Lock,
} from 'lucide-react';

const DriveResults = () => {
  const { driveId } = useParams();
  const [drive, setDrive] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isPassedFilter, setIsPassedFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exam Key Publication state
  const [togglingPublishKey, setTogglingPublishKey] = useState(false);

  // Attempt Inspection Modal
  const [inspectAttempt, setInspectAttempt] = useState(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);

  // Shortlisting state
  const [shortlistingStudentId, setShortlistingStudentId] = useState(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/results/drive/${driveId}`, {
        params: { search, isPassed: isPassedFilter },
      });
      if (res.data.success) {
        setDrive(res.data.drive);
        setResults(res.data.results);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch examination results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [driveId, isPassedFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchResults();
  };

  const handleTogglePublishKey = async () => {
    try {
      setTogglingPublishKey(true);
      setError('');
      setSuccess('');
      const targetState = !drive?.isExamKeyPublished;
      const res = await axiosClient.patch(`/drives/${driveId}/publish-key`, {
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

  const handleShortlist = async (studentId) => {
    try {
      setShortlistingStudentId(studentId);
      setError('');
      const res = await axiosClient.post('/candidates/shortlist', {
        driveId,
        studentId,
        nextStage: 'Group Discussion (GD)',
        reason: 'Qualified examination assessment',
      });
      if (res.data.success) {
        setSuccess('Candidate shortlisted successfully and advanced to Group Discussion (GD)');
        fetchResults();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to shortlist candidate');
    } finally {
      setShortlistingStudentId(null);
    }
  };

  const handleInspectAttempt = async (attemptId) => {
    try {
      setLoadingAttempt(true);
      const res = await axiosClient.get(`/results/attempt/${attemptId}`);
      if (res.data.success) {
        setInspectAttempt(res.data.attempt);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attempt details');
    } finally {
      setLoadingAttempt(false);
    }
  };

  if (loading && !drive) return <LoadingSpinner text="Loading exam results..." />;

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="mb-4">
        <Link to="/admin/drives" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-2">
          <ArrowLeft size={16} /> Back to Recruitment Drives
        </Link>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h2 className="fw-bold mb-1">Examination Results: {drive?.name}</h2>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="text-muted small">Passing Threshold: {drive?.passingCriteria?.minPercentage}%</span>
              <span className="text-muted small">|</span>
              {drive?.isExamKeyPublished ? (
                <span className="badge bg-success-subtle text-success border border-success d-inline-flex align-items-center gap-1">
                  <Check size={12} /> Exam Key Published (Results & History Visible to Students)
                </span>
              ) : (
                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning d-inline-flex align-items-center gap-1">
                  <Lock size={12} /> Exam Key Unpublished (Results & History Hidden from Students)
                </span>
              )}
            </div>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-1 ${
                drive?.isExamKeyPublished ? 'btn-outline-warning' : 'btn-success'
              }`}
              onClick={handleTogglePublishKey}
              disabled={togglingPublishKey}
              title={
                drive?.isExamKeyPublished
                  ? 'Conceal results and exam history from students'
                  : 'Publish exam key and allow students to view their scores and history'
              }
            >
              <KeyRound size={15} />
              {togglingPublishKey
                ? 'Updating...'
                : drive?.isExamKeyPublished
                ? 'Unpublish Exam Key'
                : 'Publish Exam Key & Results'}
            </button>
            <Link to={`/admin/candidates?driveId=${driveId}`} className="btn btn-primary-custom btn-sm">
              Open Candidate Pipeline &rarr;
            </Link>
          </div>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} type="danger" />
      <AlertMessage message={success} onClose={() => setSuccess('')} type="success" />

      {/* Filter and Search */}
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
                placeholder="Search candidate name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4 col-lg-3">
            <select
              className="form-select"
              value={isPassedFilter}
              onChange={(e) => setIsPassedFilter(e.target.value)}
            >
              <option value="">All Candidates</option>
              <option value="true">Passed Only</option>
              <option value="false">Failed Only</option>
            </select>
          </div>
          <div className="col-auto">
            <button type="submit" className="btn btn-outline-custom">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Results Table */}
      <div className="card custom-card overflow-hidden">
        {results.length === 0 ? (
          <div className="text-center py-5 text-muted small">No examination attempts recorded for this drive yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="py-3">Score & Percentage</th>
                  <th className="py-3">Pass / Fail</th>
                  <th className="py-3">Submission Status</th>
                  <th className="py-3">Current Round</th>
                  <th className="py-3">Submitted At</th>
                  <th className="py-3 text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((att) => {
                  const student = att.student;
                  const isShortlisted = att.candidateProgress?.overallStatus === 'shortlisted';

                  return (
                    <tr key={att._id}>
                      <td className="px-4 py-3">
                        <div className="fw-semibold text-dark">{student?.name}</div>
                        <div className="text-muted small">{student?.email}</div>
                      </td>
                      <td className="py-3">
                        <div className="fw-bold text-dark fs-6">
                          {att.score} / {att.totalMarks}
                        </div>
                        <div className="text-muted small">{att.percentage}% Score</div>
                      </td>
                      <td className="py-3">
                        <span className={`badge-custom badge-${att.isPassed ? 'passed' : 'rejected'}`}>
                          {att.isPassed ? <CheckCircle size={13} /> : <XCircle size={13} />}
                          {att.isPassed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="badge bg-light text-dark border">
                          {att.submissionStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="badge bg-primary-subtle text-primary">
                          {att.candidateProgress?.currentStage || 'Examination'}
                        </span>
                      </td>
                      <td className="py-3 text-muted small">
                        {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 text-end px-4">
                        <div className="d-inline-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-custom"
                            title="Inspect Answer Sheet"
                            onClick={() => handleInspectAttempt(att._id)}
                          >
                            <Eye size={15} /> Inspect
                          </button>
                          {!isShortlisted ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={shortlistingStudentId === student?._id}
                              onClick={() => handleShortlist(student?._id)}
                            >
                              {shortlistingStudentId === student?._id ? 'Shortlisting...' : 'Shortlist'}
                            </button>
                          ) : (
                            <span className="badge-custom badge-shortlisted">
                              Shortlisted
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Attempt Modal */}
      {inspectAttempt && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Candidate Exam Breakdown: {inspectAttempt.student?.name}</h5>
                  <div className="text-muted small">
                    Score: <strong>{inspectAttempt.score}/{inspectAttempt.totalMarks}</strong> ({inspectAttempt.percentage}%) | Status: <span className={`badge-custom badge-${inspectAttempt.isPassed ? 'passed' : 'rejected'}`}>{inspectAttempt.isPassed ? 'Passed' : 'Failed'}</span>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setInspectAttempt(null)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="d-flex flex-column gap-3">
                  {inspectAttempt.paperSnapshot?.questions?.map((q, idx) => {
                    const studentAns = inspectAttempt.answers?.find(
                      (a) => String(a.questionId) === String(q._id)
                    );
                    const selectedOpt = studentAns?.selectedOption;
                    const isCorrect = selectedOpt !== undefined && Number(selectedOpt) === Number(q.correctAnswer);

                    return (
                      <div key={idx} className="p-3 border rounded-3 bg-light">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="fw-semibold mb-1">
                              Q{idx + 1}. {q.questionText}
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {q.subjectName && (
                                <span className="badge bg-info-subtle text-info border" style={{ fontSize: '0.72rem' }}>
                                  Subject: {q.subjectName}
                                </span>
                              )}
                              {q.paperTitle && (
                                <span className="badge bg-light text-muted border" style={{ fontSize: '0.72rem' }}>
                                  Paper: {q.paperTitle}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`badge ${isCorrect ? 'bg-success' : 'bg-danger'}`}>
                            {isCorrect ? `+${q.marks} Marks` : '0 Marks'}
                          </span>
                        </div>

                        <div className="row g-2 my-2">
                          {q.options?.map((opt, optIdx) => {
                            const isChosenByStudent = selectedOpt === optIdx;
                            const isAnswerKey = q.correctAnswer === optIdx;

                            let bgClass = 'bg-white';
                            if (isAnswerKey) bgClass = 'bg-success-subtle border-success text-success fw-bold';
                            else if (isChosenByStudent && !isAnswerKey) bgClass = 'bg-danger-subtle border-danger text-danger';

                            return (
                              <div key={optIdx} className="col-md-6">
                                <div className={`p-2 px-3 rounded-2 border small d-flex justify-content-between align-items-center ${bgClass}`}>
                                  <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                  {isChosenByStudent && <span className="badge bg-secondary">Student Answer</span>}
                                  {isAnswerKey && !isChosenByStudent && <span className="badge bg-success">Correct Key</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="small text-muted mt-2">
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setInspectAttempt(null)}>
                  Close Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriveResults;
