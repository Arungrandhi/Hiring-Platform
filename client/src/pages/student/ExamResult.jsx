import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Award,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Home,
  Calendar,
  Lock,
  Clock,
  FileCheck2,
  Briefcase,
  Lightbulb,
  History,
  Filter,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';

const ExamResult = () => {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters for questions review
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'correct', 'incorrect', 'unanswered'
  const [selectedSubject, setSelectedSubject] = useState('all');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/exams/attempt/${attemptId}`);
        if (res.data.success) {
          const merged = {
            ...res.data,
            ...(res.data.result || {}),
          };

          // If exam key is published and questions are missing or empty, fetch dedicated review
          if (merged.isExamKeyPublished && (!merged.questions || merged.questions.length === 0)) {
            try {
              const reviewRes = await axiosClient.get(`/exams/review/${attemptId}`);
              if (reviewRes.data.success && reviewRes.data.questions) {
                merged.questions = reviewRes.data.questions;
              }
            } catch (revErr) {
              console.warn('Failed to fetch dedicated review questions:', revErr);
            }
          }

          setAttempt(merged);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch examination score summary');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) return <LoadingSpinner text="Computing assessment results & answer key..." />;

  const isExamKeyPublished = attempt?.isExamKeyPublished;
  const isPassed = attempt?.isPassed;
  const questions = attempt?.questions || [];

  // Metrics
  const totalQuestions = questions.length;
  const correctCount = questions.filter((q) => q.isCorrect).length;
  const wrongCount = questions.filter((q) => q.isAnswered && !q.isCorrect).length;
  const unansweredCount = questions.filter((q) => !q.isAnswered).length;

  // Unique subjects for subject filter
  const subjects = Array.from(new Set(questions.map((q) => q.subjectName).filter(Boolean)));

  // Filtered list
  const filteredQuestions = questions.filter((q) => {
    if (filterStatus === 'correct' && !q.isCorrect) return false;
    if (filterStatus === 'incorrect' && (!q.isAnswered || q.isCorrect)) return false;
    if (filterStatus === 'unanswered' && q.isAnswered) return false;
    if (selectedSubject !== 'all' && q.subjectName !== selectedSubject) return false;
    return true;
  });

  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <div className="container py-4">
      <AlertMessage message={error} onClose={() => setError('')} />

      {/* CASE 1: Exam Key is NOT yet published by Admin */}
      {!isExamKeyPublished ? (
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 text-center">
            <div className="card custom-card p-5 border-0 shadow-sm">
              <div className="d-inline-flex p-4 rounded-circle mb-3 bg-primary-subtle text-primary mx-auto">
                <Clock size={56} />
              </div>

              <h3 className="fw-bold text-dark mb-1">Examination Submitted Successfully!</h3>
              <p className="text-muted small mb-4">
                Your examination answers have been securely recorded and evaluated by the server.
              </p>

              {/* Locked Notice Box */}
              <div className="p-4 bg-light rounded-3 border mb-4 text-start">
                <div className="d-flex align-items-center gap-2 mb-2 text-warning-emphasis fw-bold">
                  <Lock size={18} className="text-warning flex-shrink-0" />
                  <span>Results, History & Answer Key Locked</span>
                </div>
                <p className="text-muted small mb-0 lh-base">
                  The recruitment drive administrator has not published the official exam key for this drive yet.
                  Per examination guidelines, your test score, percentage, exam history, and question answer key
                  will automatically unlock here once the administrator publishes the key.
                </p>
              </div>

              <div className="d-flex flex-column gap-2 mb-4">
                {attempt?.driveName && (
                  <div className="d-flex justify-content-between p-2 px-3 bg-white rounded border small text-muted">
                    <span>Recruitment Drive:</span>
                    <span className="fw-semibold text-dark">{attempt.driveName}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between p-2 px-3 bg-white rounded border small text-muted">
                  <span>Submission Status:</span>
                  <span className="badge bg-success-subtle text-success">
                    {attempt?.submissionStatus || 'Submitted'}
                  </span>
                </div>
                <div className="d-flex justify-content-between p-2 px-3 bg-white rounded border small text-muted">
                  <span>Key & Result Release:</span>
                  <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    Pending Admin Release
                  </span>
                </div>
                {attempt?.submittedAt && (
                  <div className="d-flex justify-content-between p-2 px-3 bg-white rounded border small text-muted">
                    <span>Submitted At:</span>
                    <span className="fw-medium text-dark">{new Date(attempt.submittedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="d-flex flex-wrap gap-2 justify-content-center">
                <Link to="/student/dashboard" className="btn btn-primary-custom d-flex align-items-center gap-2">
                  <Home size={18} /> Candidate Dashboard
                </Link>
                <Link to="/student/my-drives" className="btn btn-outline-custom d-flex align-items-center gap-2">
                  <Briefcase size={18} /> My Registered Drives
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CASE 2: Exam Key IS published by Admin - Full Score Summary + Questions & Answer Key Breakdown */
        <div className="d-flex flex-column gap-4">
          {/* Top Score Summary Banner */}
          <div className="card custom-card p-4">
            <div className="row align-items-center g-4">
              <div className="col-lg-7">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className={`p-3 rounded-circle ${isPassed ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                    {isPassed ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h4 className="fw-bold text-dark mb-0">
                        {isPassed ? 'Assessment Qualified!' : 'Assessment Completed'}
                      </h4>
                      <span className={`badge-custom badge-${isPassed ? 'passed' : 'rejected'}`}>
                        {isPassed ? 'Qualified' : 'Did Not Qualify'}
                      </span>
                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                        <FileCheck2 size={13} className="me-1" /> Exam Key Published
                      </span>
                    </div>
                    <p className="text-muted small mb-0 mt-1">
                      {attempt?.driveName ? `Recruitment Drive: ${attempt.driveName}` : 'Official Examination Assessment'}
                    </p>
                  </div>
                </div>

                <p className="text-muted small mb-0 lh-base">
                  The administrator has published the answer key. Below is your detailed performance breakdown,
                  including your selected answers, correct answer keys, and question explanations.
                </p>
              </div>

              {/* Score Metric Cards */}
              <div className="col-lg-5">
                <div className="row g-2">
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3 border text-center">
                      <div className="fs-3 fw-bold text-dark">{attempt?.score}</div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Score Obtained</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3 border text-center">
                      <div className="fs-3 fw-bold text-dark">{attempt?.totalMarks}</div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Total Marks</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3 border text-center">
                      <div className={`fs-3 fw-bold ${isPassed ? 'text-success' : 'text-danger'}`}>
                        {attempt?.percentage}%
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Percentage</div>
                    </div>
                  </div>
                </div>

                {/* Sub-counters for Questions */}
                {totalQuestions > 0 && (
                  <div className="d-flex justify-content-between p-2 mt-2 bg-light-subtle rounded border small">
                    <span className="text-success fw-semibold">✓ {correctCount} Correct</span>
                    <span className="text-danger fw-semibold">✗ {wrongCount} Incorrect</span>
                    <span className="text-secondary fw-semibold">○ {unansweredCount} Unanswered</span>
                    <span className="text-dark fw-bold">Total: {totalQuestions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-4 pt-3 border-top">
              <div className="text-muted small">
                Submitted on: {attempt?.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A'}
              </div>
              <div className="d-flex gap-2">
                <Link to="/student/dashboard" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
                  <Home size={15} /> Dashboard
                </Link>
                <Link to="/student/history" className="btn btn-sm btn-outline-custom d-flex align-items-center gap-1">
                  <History size={15} /> Exam History
                </Link>
                <Link to="/student/my-drives" className="btn btn-sm btn-primary-custom d-flex align-items-center gap-1">
                  <Briefcase size={15} /> My Drives
                </Link>
              </div>
            </div>
          </div>

          {/* Section: Questions Review & Answer Key */}
          <div>
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
              <div>
                <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                  <FileCheck2 size={20} className="text-primary" />
                  Examination Questions & Answer Key Review
                </h5>
                <p className="text-muted small mb-0">
                  Compare your submitted responses against the verified correct answer key
                </p>
              </div>

              {/* Filters */}
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {subjects.length > 1 && (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto' }}
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="all">All Subjects</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}

                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setFilterStatus('all')}
                  >
                    All ({totalQuestions})
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterStatus === 'correct' ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => setFilterStatus('correct')}
                  >
                    Correct ({correctCount})
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterStatus === 'incorrect' ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setFilterStatus('incorrect')}
                  >
                    Incorrect ({wrongCount})
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterStatus === 'unanswered' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setFilterStatus('unanswered')}
                  >
                    Unanswered ({unansweredCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Questions List */}
            {filteredQuestions.length === 0 ? (
              <div className="card custom-card p-5 text-center text-muted small">
                No questions match the selected filter criteria.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {filteredQuestions.map((q, idx) => {
                  const isCorrect = q.isCorrect;
                  const isAnswered = q.isAnswered;

                  return (
                    <div
                      key={q._id || idx}
                      className={`card custom-card p-4 border ${
                        isCorrect
                          ? 'border-success-subtle'
                          : isAnswered
                          ? 'border-danger-subtle'
                          : 'border-secondary-subtle'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom gap-2">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="badge bg-dark text-white font-monospace">
                            Q{q.order || idx + 1}
                          </span>
                          {q.subjectName && (
                            <span className="badge bg-primary-subtle text-primary">
                              {q.subjectName}
                            </span>
                          )}
                          {q.paperTitle && (
                            <span className="badge bg-light text-muted border">
                              {q.paperTitle}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="d-flex align-items-center gap-2">
                          {isCorrect ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
                              <CheckCircle2 size={13} /> Correct (+{q.marks} {q.marks === 1 ? 'mark' : 'marks'})
                            </span>
                          ) : isAnswered ? (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1">
                              <XCircle size={13} /> Incorrect ({q.negativeMarks > 0 ? `-${q.negativeMarks}` : '0'} marks)
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle d-inline-flex align-items-center gap-1">
                              <Clock size={13} /> Unanswered (0 marks)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="mb-4">
                        <h6 className="fw-semibold text-dark lh-base mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                          {q.questionText}
                        </h6>
                      </div>

                      {/* Options */}
                      <div className="d-flex flex-column gap-2">
                        {(q.options || []).map((option, optIdx) => {
                          const isCorrectKey = optIdx === Number(q.correctAnswer);
                          const isStudentSelection = isAnswered && optIdx === Number(q.studentChoice);

                          let containerClass = 'p-3 rounded-3 border d-flex align-items-center justify-content-between transition-all ';
                          let badgeLabel = null;
                          let badgeClass = '';

                          if (isCorrectKey && isStudentSelection) {
                            containerClass += 'bg-success-subtle border-success text-success-emphasis';
                            badgeLabel = '✓ Your Answer & Correct Key';
                            badgeClass = 'bg-success text-white';
                          } else if (isCorrectKey) {
                            containerClass += 'bg-success-subtle border-success text-success-emphasis';
                            badgeLabel = '✓ Correct Answer Key';
                            badgeClass = 'bg-success text-white';
                          } else if (isStudentSelection) {
                            containerClass += 'bg-danger-subtle border-danger text-danger-emphasis';
                            badgeLabel = '✗ Your Answer';
                            badgeClass = 'bg-danger text-white';
                          } else {
                            containerClass += 'bg-white border-light-subtle text-dark';
                          }

                          return (
                            <div key={optIdx} className={containerClass}>
                              <div className="d-flex align-items-center gap-3">
                                <span
                                  className={`fw-bold rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 ${
                                    isCorrectKey
                                      ? 'bg-success text-white'
                                      : isStudentSelection
                                      ? 'bg-danger text-white'
                                      : 'bg-light text-muted border'
                                  }`}
                                  style={{ width: 28, height: 28, fontSize: '0.85rem' }}
                                >
                                  {optionLabels[optIdx] || optIdx + 1}
                                </span>
                                <span className="small fw-medium">{option}</span>
                              </div>

                              {badgeLabel && (
                                <span className={`badge ${badgeClass} small fw-normal ms-2 flex-shrink-0`}>
                                  {badgeLabel}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation Callout */}
                      {q.explanation && (
                        <div className="mt-3 p-3 bg-light rounded-3 border-start border-4 border-info">
                          <div className="d-flex align-items-center gap-2 fw-semibold text-dark small mb-1">
                            <Lightbulb size={16} className="text-warning flex-shrink-0" />
                            <span>Explanation / Solution Note:</span>
                          </div>
                          <div className="text-muted small lh-base">{q.explanation}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamResult;
