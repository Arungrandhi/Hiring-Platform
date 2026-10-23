import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import { History, Award, CheckCircle2, XCircle, ArrowRight, Clock, Lock, FileCheck2 } from 'lucide-react';

const ExamHistory = () => {
  const [history, setHistory] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get('/student/history');
        if (res.data.success) {
          setHistory(res.data.history || []);
          setPendingCount(res.data.pendingCount || 0);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch your examination history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) return <LoadingSpinner text="Loading exam history records..." />;

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">My Examination History</h2>
          <p className="text-muted small mb-0">Review all historical examination attempts, scores, and recruitment round statuses</p>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {/* Pending Exam Key Notice */}
      {pendingCount > 0 && (
        <div className="alert alert-warning border-warning-subtle d-flex align-items-center gap-2 mb-4 py-2 px-3 small">
          <Clock size={18} className="text-warning flex-shrink-0" />
          <span>
            You have <strong>{pendingCount} completed examination(s)</strong> awaiting exam key release by the administrator. Those exam results and history will unlock here as soon as the administrator publishes the exam key.
          </span>
        </div>
      )}

      <div className="card custom-card overflow-hidden">
        {history.length === 0 ? (
          <div className="text-center py-5 text-muted small">
            {pendingCount > 0
              ? 'All recent examination attempts are currently pending administrator exam key release.'
              : 'No examination attempts recorded yet. Join an active recruitment drive to start an assessment.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Recruitment Drive & Paper</th>
                  <th className="py-3">Attempt #</th>
                  <th className="py-3">Score & Percentage</th>
                  <th className="py-3">Result</th>
                  <th className="py-3">Submission Status</th>
                  <th className="py-3">Current Round</th>
                  <th className="py-3 px-3">Date Taken</th>
                  <th className="py-3 text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3">
                      <div className="fw-semibold text-dark">{item.drive?.name || 'Drive'}</div>
                      <div className="text-muted small">Paper: {item.paperTitle}</div>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-light text-dark border">
                        Attempt {item.attemptNumber}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="fw-bold text-dark">
                        {item.score} / {item.totalMarks}
                      </div>
                      <div className="text-muted small">{item.percentage}%</div>
                    </td>
                    <td className="py-3">
                      <span className={`badge-custom badge-${item.isPassed ? 'passed' : 'rejected'}`}>
                        {item.isPassed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {item.isPassed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-light text-dark border">
                        {item.submissionStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-primary-subtle text-primary">
                        {item.recruitmentStage}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted small">
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 text-end px-4">
                      <Link
                        to={`/student/exam-result/${item._id}`}
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                      >
                        <FileCheck2 size={14} /> Review & Key
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamHistory;
