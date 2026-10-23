import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import { FileText, ArrowLeft, CheckCircle2, Clock, Award, AlertCircle } from 'lucide-react';

const QuestionPaperPreview = () => {
  const { id } = useParams();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/question-papers/${id}`);
        if (res.data.success) {
          setPaper(res.data.paper);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch question paper preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPaper();
  }, [id]);

  if (loading) return <LoadingSpinner text="Loading paper preview..." />;

  return (
    <div className="container py-4">
      <div className="mb-4">
        <Link to="/admin/question-papers" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-2">
          <ArrowLeft size={16} /> Back to Question Papers
        </Link>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h2 className="fw-bold mb-1">{paper?.title}</h2>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="badge bg-primary-subtle text-primary">{paper?.subject?.name}</span>
              <span className={`badge-custom badge-${paper?.status}`}>{paper?.status}</span>
              <span className="text-muted small">Version {paper?.version || 1}</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Link to={`/admin/question-papers/edit/${paper?._id}`} className="btn btn-outline-custom btn-sm">
              Edit Paper
            </Link>
          </div>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {/* Paper Metadata Card */}
      <div className="card custom-card p-4 mb-4">
        <div className="row g-3">
          <div className="col-sm-6 col-md-3">
            <div className="text-muted small">Duration</div>
            <div className="fw-bold d-flex align-items-center gap-1 text-dark">
              <Clock size={16} className="text-primary" /> {paper?.duration} Minutes
            </div>
          </div>

          <div className="col-sm-6 col-md-3">
            <div className="text-muted small">Total Questions & Marks</div>
            <div className="fw-bold d-flex align-items-center gap-1 text-dark">
              <Award size={16} className="text-success" /> {paper?.questions?.length} Questions ({paper?.totalMarks} Marks)
            </div>
          </div>

          <div className="col-sm-6 col-md-3">
            <div className="text-muted small">Passing Threshold</div>
            <div className="fw-bold text-dark">{paper?.passingMarks} Marks</div>
          </div>

          <div className="col-sm-6 col-md-3">
            <div className="text-muted small">Negative Marking</div>
            <div className="fw-bold text-dark">
              {paper?.negativeMarking?.enabled
                ? `Enabled (${paper?.negativeMarking?.perQuestionPenalty} marks penalty)`
                : 'Disabled'}
            </div>
          </div>

          {paper?.instructions && (
            <div className="col-12 pt-2 border-top">
              <div className="text-muted small fw-semibold">Candidate Instructions:</div>
              <p className="small text-muted mb-0">{paper?.instructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Questions Preview */}
      <h5 className="fw-bold mb-3">Question List & Solution Keys (Admin Review)</h5>

      <div className="d-flex flex-column gap-3">
        {paper?.questions?.map((q, qIndex) => (
          <div key={q._id || qIndex} className="card custom-card p-4">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="fw-bold mb-0">
                <span className="text-primary me-2">Q{qIndex + 1}.</span> {q.questionText}
              </h6>
              <span className="badge bg-light text-dark border">
                {q.marks} Mark{q.marks > 1 ? 's' : ''}
              </span>
            </div>

            <div className="row g-2 my-2">
              {q.options?.map((opt, optIndex) => {
                const isCorrect = q.correctAnswer === optIndex;
                return (
                  <div key={optIndex} className="col-md-6">
                    <div
                      className={`p-3 rounded-3 border d-flex align-items-center justify-content-between ${
                        isCorrect ? 'bg-success-subtle border-success' : 'bg-light'
                      }`}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold small text-muted">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <span className={`small ${isCorrect ? 'fw-bold text-success' : 'text-dark'}`}>
                          {opt}
                        </span>
                      </div>
                      {isCorrect && (
                        <span className="badge bg-success text-white small d-flex align-items-center gap-1">
                          <CheckCircle2 size={12} /> Correct
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <div className="p-2 bg-light rounded-2 mt-2 small text-muted">
                <strong className="text-dark">Explanation:</strong> {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionPaperPreview;
