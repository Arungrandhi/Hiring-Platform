import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AlertMessage from '../../components/AlertMessage';
import { KeyRound, ArrowRight, Briefcase, Calendar, Clock, CheckCircle } from 'lucide-react';

const JoinDrive = () => {
  const [driveCode, setDriveCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [joinedDrive, setJoinedDrive] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setJoinedDrive(null);

    const cleanCode = driveCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a recruitment drive code');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axiosClient.post('/drive-registrations/join', {
        driveCode: cleanCode,
      });

      if (res.data.success) {
        setJoinedDrive(res.data.drive);
        setAlreadyRegistered(res.data.alreadyRegistered);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to validate drive code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-6 col-md-8">
          <div className="card custom-card p-4 p-md-5 border-0 shadow-sm">
            <div className="text-center mb-4">
              <div className="d-inline-flex p-3 rounded-circle bg-primary-subtle text-primary mb-3">
                <KeyRound size={36} />
              </div>
              <h3 className="fw-bold text-dark">Join Recruitment Drive</h3>
              <p className="text-muted small">
                Enter the unique access code provided by your campus recruiter or employer
              </p>
            </div>

            <AlertMessage message={error} onClose={() => setError('')} />

            {!joinedDrive ? (
              <form onSubmit={handleJoin}>
                <div className="mb-4">
                  <label className="form-label small fw-semibold">Recruitment Drive Code *</label>
                  <input
                    type="text"
                    className="form-control form-control-lg text-center font-monospace text-uppercase fw-bold"
                    placeholder="e.g. HIRE-TECH26"
                    value={driveCode}
                    onChange={(e) => setDriveCode(e.target.value)}
                    required
                  />
                  <div className="form-text text-center small mt-2">
                    Tip: You can use the demo drive code <strong className="text-primary">HIRE-TECH26</strong>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary-custom w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? 'Verifying Code...' : 'Verify & Join Drive'}
                  {!submitting && <ArrowRight size={18} />}
                </button>
              </form>
            ) : (
              /* Success / Drive Overview Confirmation Card */
              <div className="p-4 bg-light rounded-3 border">
                <div className="d-flex align-items-center gap-2 text-success fw-bold mb-3">
                  <CheckCircle size={22} />
                  <span>{alreadyRegistered ? 'Already Registered!' : 'Successfully Joined!'}</span>
                </div>

                <h5 className="fw-bold text-dark mb-1">{joinedDrive.name}</h5>
                <div className="text-muted small mb-3">
                  Role: <strong className="text-dark">{joinedDrive.jobTitle}</strong>
                </div>

                <div className="d-flex flex-column gap-2 small text-muted mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <Clock size={15} /> Duration: <strong>{joinedDrive.totalDuration} Minutes</strong>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Calendar size={15} /> Active: <strong>{new Date(joinedDrive.startDate).toLocaleDateString()} &ndash; {new Date(joinedDrive.endDate).toLocaleDateString()}</strong>
                  </div>
                  {joinedDrive.jobDescription && (
                    <div className="p-2 bg-white rounded border mt-2">
                      {joinedDrive.jobDescription}
                    </div>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <Link
                    to={`/student/exam-instructions/${joinedDrive._id}`}
                    className="btn btn-primary-custom w-100 py-2 text-center"
                  >
                    Proceed to Examination &rarr;
                  </Link>
                  <Link to="/student/dashboard" className="btn btn-outline-custom">
                    Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinDrive;
