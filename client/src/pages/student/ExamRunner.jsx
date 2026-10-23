import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flag,
  ArrowLeft,
  ArrowRight,
  Maximize,
  ShieldAlert,
  Send,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

const ExamRunner = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paperTitle, setPaperTitle] = useState('Examination');
  const [totalMarks, setTotalMarks] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [papers, setPapers] = useState([]);
  const [selectedSection, setSelectedSection] = useState('all');
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Answers Map: { [questionId]: selectedOption (0, 1, 2, 3) }
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [savingStatus, setSavingStatus] = useState('All changes saved');

  // Timer State
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [deadline, setDeadline] = useState(null);

  // Fullscreen & Anti-Cheat Protection
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [copyAlert, setCopyAlert] = useState('');

  // Submit Confirmation Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helper to trigger Fullscreen
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch (fsErr) {
      console.warn('Fullscreen entry rejected:', fsErr);
    }
  };

  // Fullscreen Change Detection
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    // Prompt or attempt entering fullscreen when exam runner mounts
    if (!document.fullscreenElement) {
      enterFullscreen().catch(() => {});
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Anti-Copy & Anti-Malpractice Event Listeners
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      setCopyAlert('Right-click context menu is disabled during the exam.');
    };

    const handleCopy = (e) => {
      e.preventDefault();
      setCopyAlert('Copying text is strictly disabled during the examination.');
    };

    const handleCut = (e) => {
      e.preventDefault();
      setCopyAlert('Cutting text is strictly disabled during the examination.');
    };

    const handlePaste = (e) => {
      e.preventDefault();
    };

    const handleSelectStart = (e) => {
      e.preventDefault();
    };

    const handleDragStart = (e) => {
      e.preventDefault();
    };

    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Disable F12 (Inspect)
      if (e.key === 'F12') {
        e.preventDefault();
        setCopyAlert('Developer tools are disabled during the examination.');
        return;
      }

      // Disable Ctrl+Shift+I / J / C (DevTools)
      if (isCtrlOrCmd && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        setCopyAlert('Inspection shortcuts are disabled during the examination.');
        return;
      }

      // Disable Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+A, Ctrl+U (View Source), Ctrl+P (Print)
      if (isCtrlOrCmd && ['c', 'C', 'x', 'X', 'v', 'V', 'a', 'A', 'u', 'U', 'p', 'P'].includes(e.key)) {
        e.preventDefault();
        setCopyAlert('Copy, select, and print keyboard shortcuts are disabled during the exam.');
        return;
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('selectstart', handleSelectStart);
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Dismiss copy alert after 3 seconds
  useEffect(() => {
    if (copyAlert) {
      const timer = setTimeout(() => setCopyAlert(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [copyAlert]);

  // Fetch Attempt and initialize
  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/exams/attempt/${attemptId}`);
        if (res.data.success) {
          if (res.data.isExpired || res.data.submissionStatus === 'submitted' || res.data.submissionStatus === 'auto-submitted') {
            navigate(`/student/exam-result/${attemptId}`);
            return;
          }

          setPaperTitle(res.data.paperTitle || 'Examination');
          setTotalMarks(res.data.totalMarks || 0);
          setQuestions(res.data.questions || []);
          setPapers(res.data.papers || []);
          setDeadline(new Date(res.data.deadline));

          // Calculate initial remaining seconds
          const diff = Math.max(0, Math.floor((new Date(res.data.deadline) - new Date()) / 1000));
          setRemainingSeconds(diff);

          // Populate previously saved draft answers
          const ansMap = {};
          if (res.data.savedAnswers && Array.isArray(res.data.savedAnswers)) {
            res.data.savedAnswers.forEach((a) => {
              if (a.questionId && a.selectedOption !== null && a.selectedOption !== undefined) {
                ansMap[String(a.questionId)] = a.selectedOption;
              }
            });
          }
          setAnswers(ansMap);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to initialize examination');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempt();
  }, [attemptId]);

  // Countdown Timer Hook
  useEffect(() => {
    if (!deadline) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((new Date(deadline) - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  // Auto-save draft answers to server
  const saveAnswersToServer = async (currentAnswers) => {
    try {
      setSavingStatus('Saving draft...');
      const payload = Object.entries(currentAnswers).map(([qId, opt]) => ({
        questionId: qId,
        selectedOption: opt,
      }));

      await axiosClient.post(`/exams/save-answers/${attemptId}`, {
        answers: payload,
      });
      setSavingStatus('All changes saved');
    } catch (err) {
      setSavingStatus('Save error (will retry)');
    }
  };

  const handleSelectOption = (optIndex) => {
    const activeQ = questions[currentQIndex];
    if (!activeQ) return;

    const updated = {
      ...answers,
      [String(activeQ._id)]: optIndex,
    };
    setAnswers(updated);
    saveAnswersToServer(updated);
  };

  const handleClearSelection = () => {
    const activeQ = questions[currentQIndex];
    if (!activeQ) return;

    const updated = { ...answers };
    delete updated[String(activeQ._id)];
    setAnswers(updated);
    saveAnswersToServer(updated);
  };

  const handleToggleFlag = () => {
    const activeQ = questions[currentQIndex];
    if (!activeQ) return;

    setFlagged({
      ...flagged,
      [String(activeQ._id)]: !flagged[String(activeQ._id)],
    });
  };

  // Submit Exam
  const handleSubmitExam = async (isAuto = false) => {
    try {
      setSubmitting(true);
      setError('');

      const payload = Object.entries(answers).map(([qId, opt]) => ({
        questionId: qId,
        selectedOption: opt,
      }));

      const res = await axiosClient.post(`/exams/submit/${attemptId}`, {
        answers: payload,
      });

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (fsErr) {
          console.warn('Exit fullscreen error:', fsErr);
        }
      }

      if (res.data.success) {
        navigate(`/student/exam-result/${attemptId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit examination');
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitExam(true);
  };

  if (loading) return <LoadingSpinner text="Starting exam environment..." />;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQ = questions[currentQIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const isUrgent = remainingSeconds < 300; // less than 5 minutes

  return (
    <div
      className="exam-runner d-flex flex-column min-vh-100 bg-light"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {/* Fullscreen Required Modal / Backdrop */}
      {!isFullscreen && (
        <div
          className="fullscreen-modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div className="card text-center p-4 p-md-5 border-0 shadow-lg" style={{ maxWidth: 520, borderRadius: 16 }}>
            <div className="d-inline-flex p-3 rounded-circle bg-warning-subtle text-warning mb-3 mx-auto">
              <Maximize size={48} />
            </div>
            <h4 className="fw-bold text-dark mb-2">Fullscreen Examination Required</h4>
            <p className="text-muted small mb-4">
              To ensure secure testing conditions, you must remain in full screen mode for the entire duration of the exam. Text copying, right-clicking, and tabs switching are strictly prohibited.
            </p>
            <button
              type="button"
              className="btn btn-primary-custom btn-lg d-inline-flex align-items-center justify-content-center gap-2 py-2"
              onClick={enterFullscreen}
            >
              <Maximize size={20} /> Enter Fullscreen Mode
            </button>
          </div>
        </div>
      )}

      {/* Floating Anti-Copy Warning Toast */}
      {copyAlert && (
        <div
          className="alert alert-danger shadow-lg d-flex align-items-center gap-2 py-2 px-3"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 100000,
            borderRadius: 8,
          }}
        >
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span className="small fw-semibold">{copyAlert}</span>
        </div>
      )}

      {/* Sticky Header with Countdown */}
      <header className="exam-header py-3 px-4">
        <div className="container-fluid d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h5 className="fw-bold mb-0 text-dark">{paperTitle}</h5>
            <div className="text-muted small d-flex align-items-center gap-2 mt-1">
              <span>Question {currentQIndex + 1} of {questions.length} | Total Marks: {totalMarks}</span>
              {currentQ?.subjectName && (
                <span className="badge bg-primary-subtle text-primary">
                  {currentQ.subjectName}
                </span>
              )}
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Fullscreen status indicator */}
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-1 ${
                isFullscreen ? 'btn-outline-success' : 'btn-outline-warning'
              }`}
              onClick={enterFullscreen}
              title={isFullscreen ? 'Fullscreen active' : 'Click to enter fullscreen'}
            >
              <Maximize size={15} />
              <span className="d-none d-sm-inline">{isFullscreen ? 'Fullscreen Active' : 'Enter Fullscreen'}</span>
            </button>

            {/* Save Status Indicator */}
            <span className="small text-muted d-none d-md-inline">{savingStatus}</span>

            {/* Synchronized Timer */}
            <div className={`timer-box d-flex align-items-center gap-2 ${!isUrgent ? 'timer-normal' : ''}`}>
              <Clock size={20} />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              className="btn btn-primary-custom d-flex align-items-center gap-1 btn-sm px-3"
              onClick={() => setShowSubmitModal(true)}
            >
              <Send size={15} /> Finish & Submit
            </button>
          </div>
        </div>
      </header>

      {/* Main Examination Body */}
      <div className="container-fluid py-4 flex-grow-1">
        <div className="row g-4 justify-content-center">
          {/* Active Question Panel */}
          <div className="col-lg-8 col-xl-9">
            <AlertMessage message={error} onClose={() => setError('')} />

            {currentQ ? (
              <div className="card custom-card p-4 p-md-5 mb-4 shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="badge bg-primary-subtle text-primary fw-bold px-3 py-2 rounded-pill">
                      Question #{currentQIndex + 1}
                    </span>
                    {currentQ.subjectName && (
                      <span className="badge bg-info-subtle text-info border">
                        Subject: {currentQ.subjectName}
                      </span>
                    )}
                    {currentQ.paperTitle && (
                      <span className="badge bg-light text-muted border d-none d-sm-inline">
                        Paper: {currentQ.paperTitle}
                      </span>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-dark border">
                      {currentQ.marks} Mark{currentQ.marks > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      className={`btn btn-sm d-flex align-items-center gap-1 ${
                        flagged[String(currentQ._id)] ? 'btn-warning' : 'btn-outline-custom'
                      }`}
                      onClick={handleToggleFlag}
                      title="Mark for review"
                    >
                      <Flag size={14} />
                      <span className="d-none d-sm-inline">
                        {flagged[String(currentQ._id)] ? 'Flagged' : 'Flag'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <h5 className="fw-semibold text-dark mb-4 lh-base">
                  {currentQ.questionText}
                </h5>

                {/* 4 Multiple Choice Options */}
                <div className="d-flex flex-column gap-3 mb-4">
                  {currentQ.options?.map((opt, optIdx) => {
                    const isSelected = answers[String(currentQ._id)] === optIdx;

                    return (
                      <div
                        key={optIdx}
                        className={`option-card d-flex align-items-center gap-3 ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(optIdx)}
                      >
                        <div className="form-check">
                          <input
                            className="form-check-input mt-0"
                            type="radio"
                            name={`q_${currentQ._id}`}
                            checked={isSelected}
                            onChange={() => handleSelectOption(optIdx)}
                          />
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-muted" style={{ minWidth: 20 }}>
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="text-dark">{opt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Controls Bar */}
                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <div>
                    {answers[String(currentQ._id)] !== undefined && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                        onClick={handleClearSelection}
                      >
                        <RotateCcw size={14} /> Clear Selection
                      </button>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-custom d-flex align-items-center gap-1"
                      disabled={currentQIndex === 0}
                      onClick={() => setCurrentQIndex(currentQIndex - 1)}
                    >
                      <ArrowLeft size={16} /> Previous
                    </button>

                    {currentQIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        className="btn btn-primary-custom d-flex align-items-center gap-1"
                        onClick={() => setCurrentQIndex(currentQIndex + 1)}
                      >
                        Next <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-success d-flex align-items-center gap-1"
                        onClick={() => setShowSubmitModal(true)}
                      >
                        <Send size={16} /> Submit Exam
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Question Palette Sidebar */}
          <div className="col-lg-4 col-xl-3">
            <div className="card custom-card p-4 sticky-top" style={{ top: 85 }}>
              <h6 className="fw-bold mb-3">Question Navigation Palette</h6>

              {/* Status Legend */}
              <div className="d-flex flex-wrap gap-2 mb-3 text-muted" style={{ fontSize: '0.75rem' }}>
                <span className="d-flex align-items-center gap-1">
                  <span className="d-inline-block rounded-circle bg-success" style={{ width: 10, height: 10 }}></span>
                  Answered ({answeredCount})
                </span>
                <span className="d-flex align-items-center gap-1">
                  <span className="d-inline-block rounded-circle bg-white border" style={{ width: 10, height: 10 }}></span>
                  Unanswered ({unansweredCount})
                </span>
                <span className="d-flex align-items-center gap-1">
                  <span className="d-inline-block rounded-circle bg-warning" style={{ width: 10, height: 10 }}></span>
                  Flagged
                </span>
              </div>

              {/* Subject Sections Filter (if multiple papers) */}
              {papers.length > 1 && (
                <div className="mb-3 p-2 bg-light rounded border">
                  <div className="text-muted fw-semibold mb-2" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    Subjects / Sections:
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    <button
                      type="button"
                      className={`btn btn-xs py-1 px-2 rounded-pill ${selectedSection === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setSelectedSection('all')}
                    >
                      All ({questions.length})
                    </button>
                    {papers.map((p) => {
                      const pCount = questions.filter(
                        (q) => String(q.paperId) === String(p._id) || q.paperTitle === p.title
                      ).length;
                      return (
                        <button
                          key={p._id}
                          type="button"
                          className={`btn btn-xs py-1 px-2 rounded-pill ${selectedSection === p.title ? 'btn-primary' : 'btn-outline-secondary'}`}
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => {
                            setSelectedSection(p.title);
                            const firstIdx = questions.findIndex(
                              (q) => String(q.paperId) === String(p._id) || q.paperTitle === p.title
                            );
                            if (firstIdx !== -1) setCurrentQIndex(firstIdx);
                          }}
                        >
                          {p.subjectName || p.title} ({pCount})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grid of question buttons */}
              <div className="d-flex flex-wrap gap-2 mb-4">
                {questions.map((q, idx) => {
                  const isAnswered = answers[String(q._id)] !== undefined;
                  const isCurrent = currentQIndex === idx;
                  const isFlagged = flagged[String(q._id)];
                  const isMatchedSection =
                    selectedSection === 'all' ||
                    String(q.paperId) === String(selectedSection) ||
                    q.paperTitle === selectedSection;

                  if (!isMatchedSection) return null;

                  let btnClass = 'question-nav-btn';
                  if (isAnswered) btnClass += ' answered';
                  if (isFlagged) btnClass += ' flagged';
                  if (isCurrent) btnClass += ' active';

                  return (
                    <button
                      key={q._id || idx}
                      type="button"
                      className={btnClass}
                      onClick={() => setCurrentQIndex(idx)}
                      title={`Go to Question #${idx + 1}${q.subjectName ? ` - ${q.subjectName}` : ''}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Submit */}
              <button
                type="button"
                className="btn btn-primary-custom w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                onClick={() => setShowSubmitModal(true)}
              >
                <Send size={16} /> Finish Examination
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Submit Examination</h5>
                <button type="button" className="btn-close" onClick={() => setShowSubmitModal(false)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                <div className="d-inline-flex p-3 rounded-circle bg-primary-subtle text-primary mb-3">
                  <CheckCircle2 size={40} />
                </div>
                <h5 className="fw-bold text-dark">Are you sure you want to finish?</h5>
                <p className="text-muted small mb-3">
                  Once submitted, your answers will be graded by the server and your score recorded.
                </p>

                <div className="d-flex justify-content-center gap-3 p-3 bg-light rounded-3 mb-3">
                  <div>
                    <div className="fs-5 fw-bold text-success">{answeredCount}</div>
                    <div className="small text-muted">Answered</div>
                  </div>
                  <div className="border-end"></div>
                  <div>
                    <div className="fs-5 fw-bold text-danger">{unansweredCount}</div>
                    <div className="small text-muted">Unanswered</div>
                  </div>
                </div>

                {unansweredCount > 0 && (
                  <div className="alert alert-warning small py-2 mb-0 d-flex align-items-center gap-2 text-start">
                    <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                    <span>You still have {unansweredCount} unanswered questions.</span>
                  </div>
                )}
              </div>

              <div className="modal-footer justify-content-center">
                <button type="button" className="btn btn-light" onClick={() => setShowSubmitModal(false)}>
                  Return to Questions
                </button>
                <button
                  type="button"
                  className="btn btn-primary-custom"
                  onClick={() => handleSubmitExam(false)}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting & Evaluating...' : 'Confirm Submission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRunner;
