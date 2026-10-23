import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Award,
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const RecruitmentProgress = () => {
  const { driveId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/student/progress/${driveId}`);
        if (res.data.success) {
          setData(res.data.candidateProgress);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch recruitment stage progress');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [driveId]);

  if (loading) return <LoadingSpinner text="Fetching your recruitment status..." />;

  const drive = data?.drive;
  const stagesList = drive?.stages || [
    'Examination',
    'Group Discussion (GD)',
    'Technical Interview',
    'HR Interview',
    'CEO Interview',
    'Selected or Rejected',
  ];

  const currentStageIndex = stagesList.indexOf(data?.currentStage);

  return (
    <div className="container py-4">
      <div className="mb-4">
        <Link to="/student/dashboard" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-2">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h2 className="fw-bold mb-1">Recruitment Progression: {drive?.name}</h2>
            <div className="text-muted small">
              Role: <strong>{drive?.jobTitle}</strong> | Overall Status:{' '}
              <span className={`badge-custom badge-${data?.overallStatus || 'pending'}`}>
                {data?.overallStatus || 'pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {/* Sequential Pipeline Stepper */}
      <div className="card custom-card p-4 mb-4">
        <h5 className="fw-bold mb-4">Recruitment Pipeline Stages</h5>

        <div className="row g-3">
          {stagesList.map((stageName, idx) => {
            let circleClass = 'step-circle';
            if (idx < currentStageIndex) circleClass += ' completed';
            else if (idx === currentStageIndex) circleClass += ' current';

            return (
              <div key={idx} className="col-md-6 col-lg-4">
                <div className="p-3 bg-light rounded-3 border d-flex align-items-center gap-3 h-100">
                  <div className={circleClass}>
                    {idx < currentStageIndex ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <div>
                    <div className="fw-semibold small text-dark">{stageName}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      {idx < currentStageIndex
                        ? 'Completed'
                        : idx === currentStageIndex
                        ? 'Current Round'
                        : 'Upcoming Round'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Round-Wise Details & Scheduled Interviews */}
      <div className="card custom-card p-4">
        <h5 className="fw-bold mb-3">Round Evaluations & Interview Schedules</h5>

        {data?.roundEvaluations?.length === 0 ? (
          <p className="text-muted small mb-0">No specific interview schedules posted yet.</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {data?.roundEvaluations?.map((evaluation, idx) => (
              <div key={idx} className="p-3 rounded-3 border bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0 text-dark">{evaluation.stageName}</h6>
                  <span className={`badge-custom badge-${evaluation.status || 'pending'}`}>
                    {evaluation.status || 'Pending'}
                  </span>
                </div>

                <div className="row g-2 small text-muted my-2">
                  {evaluation.interviewDate && (
                    <div className="col-sm-6 d-flex align-items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      <span>Interview Date: <strong>{new Date(evaluation.interviewDate).toLocaleDateString()}</strong></span>
                    </div>
                  )}

                  {evaluation.interviewTime && (
                    <div className="col-sm-6 d-flex align-items-center gap-2">
                      <Clock size={14} className="text-primary" />
                      <span>Time: <strong>{evaluation.interviewTime}</strong></span>
                    </div>
                  )}

                  {evaluation.locationOrLink && (
                    <div className="col-12 mt-2">
                      <a
                        href={evaluation.locationOrLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                      >
                        <Video size={14} /> Join Scheduled Meeting / View Location
                      </a>
                    </div>
                  )}
                </div>

                {evaluation.candidateNotes && (
                  <div className="p-2 bg-white rounded border small text-muted mt-2">
                    <strong className="text-dark">Candidate Notes:</strong> {evaluation.candidateNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitmentProgress;
