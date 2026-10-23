import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  FileCheck2,
  Clock,
  Award,
  AlertTriangle,
  PlayCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

const ExamInstructions = () => {
  const { driveId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/exams/instructions/${driveId}`);
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch examination instructions');
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, [driveId]);

  const handleStartExam = async () => {
    try {
      setStarting(true);
      setError('');

      // Attempt to enter fullscreen on user gesture
      if (document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (fsErr) {
          console.warn('Fullscreen request deferred to exam environment:', fsErr);
        }
      }

      const res = await axiosClient.post(`/exams/start/${driveId}`);
      if (res.data.success) {
        navigate(`/student/exam/${res.data.attemptId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start examination');
      setStarting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading examination parameters..." />;

  const drive = data?.drive;
  const papers = drive?.selectedPapers || [];
  const primaryPaper = papers[0];

  const totalCalculatedMarks = drive?.totalMarks || papers.reduce((sum, p) => sum + (p.totalMarks || 0), 0);
  const totalCalculatedQuestions = drive?.totalQuestions || papers.reduce((sum, p) => sum + (p.questions?.length || 0), 0);
  const passingMarks = drive?.passingMarks || Math.ceil((totalCalculatedMarks * (drive?.passingCriteria?.minPercentage || 50)) / 100);

  return (
    <div className="container py-4">
      <div className="mb-4">
        <Link to="/student/my-drives" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-2">
          <ArrowLeft size={16} /> Back to My Drives
        </Link>
        <h2 className="fw-bold mb-1">Examination Instructions</h2>
        <p className="text-muted small">Please review all rules and examination guidelines before starting your attempt</p>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Instructions Card */}
          <div className="card custom-card p-4 mb-4">
            <h4 className="fw-bold text-dark mb-1">{drive?.name}</h4>
            <div className="text-muted small mb-3">
              Role Assessment: <strong className="text-dark">{drive?.jobTitle}</strong>
            </div>

            {/* Papers List */}
            <div className="p-3 bg-light rounded-3 border mb-4">
              <div className="fw-bold small text-dark mb-2">
                Examination Papers Included ({papers.length} {papers.length > 1 ? 'Sections' : 'Section'}):
              </div>
              <div className="d-flex flex-column gap-2">
                {papers.map((p, idx) => (
                  <div key={p._id || idx} className="d-flex flex-wrap justify-content-between align-items-center p-2 px-3 bg-white rounded border small">
                    <div>
                      <span className="fw-semibold text-primary me-2">{p.title}</span>
                      <span className="badge bg-light text-muted border">
                        Subject: {p.subject?.name || 'General'}
                      </span>
                    </div>
                    <div className="text-muted d-flex gap-3">
                      <span>{p.questions?.length !== undefined ? `${p.questions.length} Questions` : ''}</span>
                      <span className="fw-semibold text-dark">{p.totalMarks} Marks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h6 className="fw-bold text-dark mb-3">Important Examination Guidelines:</h6>
            <div className="d-flex flex-column gap-3 mb-4 text-muted small">
              <div className="d-flex align-items-start gap-2">
                <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-1" />
                <div>
                  <strong>Mandatory Fullscreen Mode:</strong> The examination opens and runs strictly in full screen mode. If you exit full screen mode, you will be prompted to re-enter to continue.
                </div>
              </div>

              <div className="d-flex align-items-start gap-2">
                <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-1" />
                <div>
                  <strong>Clipboard & Copy Protection:</strong> Copying text, text selection, and right-click context menus are strictly disabled throughout the assessment.
                </div>
              </div>

              <div className="d-flex align-items-start gap-2">
                <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-1" />
                <div>
                  <strong>Result & Key Release:</strong> After completing the exam, your answers are safely evaluated and recorded. Exam history and results remain private until the drive administrator publishes the exam key.
                </div>
              </div>

              <div className="d-flex align-items-start gap-2">
                <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-1" />
                <div>
                  <strong>Timer Synchronization:</strong> The exam deadline is enforced on the server. The timer begins the moment you click Start Examination.
                </div>
              </div>

              <div className="d-flex align-items-start gap-2">
                <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-1" />
                <div>
                  <strong>Auto-Save Drafts:</strong> Your answer selections are automatically saved periodically. You can refresh or change questions without losing saved choices.
                </div>
              </div>

              <div className="d-flex align-items-start gap-2">
                <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-1" />
                <div>
                  <strong>Automatic Submission:</strong> When the remaining countdown hits 00:00, the system automatically submits all saved answers for server-side evaluation.
                </div>
              </div>

              {papers.some((p) => p.negativeMarking?.enabled) && (
                <div className="d-flex align-items-start gap-2 text-warning-emphasis bg-warning-subtle p-2 rounded-2">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-1 text-warning" />
                  <div>
                    <strong>Negative Marking Active:</strong> Incorrect answers incur penalties per question specification. Unanswered questions do not receive penalties.
                  </div>
                </div>
              )}
            </div>

            {papers.map((p, idx) => p.instructions ? (
              <div key={idx} className="p-3 bg-light rounded-3 border mb-3">
                <div className="fw-bold small text-dark mb-1">{p.title} - Author's Instructions:</div>
                <div className="small text-muted">{p.instructions}</div>
              </div>
            ) : null)}

            <div className="pt-3 border-top">
              {data?.canAttempt ? (
                <button
                  type="button"
                  className="btn btn-primary-custom btn-lg d-inline-flex align-items-center gap-2"
                  onClick={handleStartExam}
                  disabled={starting}
                >
                  <PlayCircle size={22} />
                  {starting ? 'Initiating Examination...' : data?.hasActiveAttempt ? 'Resume Active Exam' : 'Start Examination Now'}
                </button>
              ) : (
                <div className="alert alert-info small mb-0">
                  You have already reached the maximum attempt limit ({drive?.maxAttempts}) for this recruitment drive.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Exam Summary Column */}
        <div className="col-lg-4">
          <div className="card custom-card p-4">
            <h5 className="fw-bold mb-3">Assessment Summary</h5>
            <div className="d-flex flex-column gap-3">
              <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <Clock size={18} className="text-primary" /> Total Duration
                </div>
                <div className="fw-bold text-dark">{drive?.totalDuration} Mins</div>
              </div>

              {totalCalculatedQuestions > 0 && (
                <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <FileCheck2 size={18} className="text-primary" /> Total Questions
                  </div>
                  <div className="fw-bold text-dark">{totalCalculatedQuestions} Questions</div>
                </div>
              )}

              <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <Award size={18} className="text-success" /> Total Marks
                </div>
                <div className="fw-bold text-dark">{totalCalculatedMarks} Marks</div>
              </div>

              <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                <div className="text-muted small">Passing Threshold</div>
                <div className="fw-bold text-dark">{passingMarks} Marks ({drive?.passingCriteria?.minPercentage}%)</div>
              </div>

              <div className="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                <div className="text-muted small">Attempts Allowed</div>
                <div className="fw-bold text-dark">{data?.attemptCount} / {drive?.maxAttempts} Used</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInstructions;
