import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import { Briefcase, ArrowLeft, Save, Plus, Trash2, CheckCircle } from 'lucide-react';

const DEFAULT_STAGES = [
  'Examination',
  'Group Discussion (GD)',
  'Technical Interview',
  'HR Interview',
  'CEO Interview',
  'Selected or Rejected',
];

const DriveEditor = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [publishedPapers, setPublishedPapers] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    jobTitle: '',
    jobDescription: '',
    eligibility: {
      department: 'Computer Science, IT, or equivalent',
      minGraduationYear: 2024,
      maxGraduationYear: 2027,
      minimumPercentage: 60,
      additionalNotes: '',
    },
    selectedPapers: [],
    totalDuration: 30,
    passingCriteria: {
      minPercentage: 50,
      minMarks: 0,
    },
    maxAttempts: 1,
    status: 'active',
    startDate: today,
    endDate: nextMonth,
    stages: DEFAULT_STAGES,
  });

  const [newStageName, setNewStageName] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const papersRes = await axiosClient.get('/question-papers', { params: { status: 'published', limit: 100 } });
        if (papersRes.data.success) {
          setPublishedPapers(resDataFilter(papersRes.data.papers));
        }

        if (isEditing) {
          const driveRes = await axiosClient.get(`/drives/${id}`);
          if (driveRes.data.success) {
            const d = driveRes.data.drive;
            setFormData({
              name: d.name,
              jobTitle: d.jobTitle,
              jobDescription: d.jobDescription || '',
              eligibility: {
                department: d.eligibility?.department || '',
                minGraduationYear: d.eligibility?.minGraduationYear || '',
                maxGraduationYear: d.eligibility?.maxGraduationYear || '',
                minimumPercentage: d.eligibility?.minimumPercentage || 0,
                additionalNotes: d.eligibility?.additionalNotes || '',
              },
              selectedPapers: d.selectedPapers ? d.selectedPapers.map((p) => p._id || p) : [],
              totalDuration: d.totalDuration || 30,
              passingCriteria: {
                minPercentage: d.passingCriteria?.minPercentage || 50,
                minMarks: d.passingCriteria?.minMarks || 0,
              },
              maxAttempts: d.maxAttempts || 1,
              status: d.status || 'active',
              startDate: d.startDate ? new Date(d.startDate).toISOString().split('T')[0] : today,
              endDate: d.endDate ? new Date(d.endDate).toISOString().split('T')[0] : nextMonth,
              stages: d.stages && d.stages.length > 0 ? d.stages : DEFAULT_STAGES,
            });
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to initialize drive editor');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id, isEditing]);

  const resDataFilter = (papers) => {
    return papers || [];
  };

  const handleTogglePaper = (paperId) => {
    const exists = formData.selectedPapers.includes(paperId);
    let updated;
    if (exists) {
      updated = formData.selectedPapers.filter((p) => p !== paperId);
    } else {
      updated = [...formData.selectedPapers, paperId];
    }
    setFormData({ ...formData, selectedPapers: updated });
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    setFormData({
      ...formData,
      stages: [...formData.stages, newStageName.trim()],
    });
    setNewStageName('');
  };

  const handleRemoveStage = (index) => {
    if (formData.stages.length <= 2) {
      setError('Pipeline must contain at least 2 stages');
      return;
    }
    const updated = formData.stages.filter((_, idx) => idx !== index);
    setFormData({ ...formData, stages: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.jobTitle.trim()) {
      setError('Drive name and job title are required');
      return;
    }

    if (formData.selectedPapers.length === 0) {
      setError('Please select at least one published question paper for the examination');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await axiosClient.put(`/drives/${id}`, formData);
      } else {
        await axiosClient.post('/drives', formData);
      }
      navigate('/admin/drives');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save recruitment drive');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading drive parameters..." />;

  return (
    <div className="container py-4">
      <div className="mb-4">
        <Link to="/admin/drives" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-2">
          <ArrowLeft size={16} /> Back to Recruitment Drives
        </Link>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h2 className="fw-bold mb-1">{isEditing ? 'Edit Recruitment Drive' : 'Launch New Recruitment Drive'}</h2>
            <p className="text-muted small mb-0">Configure drive details, evaluation criteria, paper assignment, and round stages</p>
          </div>
          <button type="button" onClick={handleSubmit} className="btn btn-primary-custom d-flex align-items-center gap-2" disabled={submitting}>
            <Save size={18} /> {submitting ? 'Saving...' : 'Save Drive'}
          </button>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      <form onSubmit={handleSubmit}>
        {/* Basic Drive Details */}
        <div className="card custom-card p-4 mb-4">
          <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <Briefcase size={20} className="text-primary" /> Role & Drive Details
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Drive Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Saanvika Software Solutions 2026 Graduate Software Engineer Drive"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Job Title / Role *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Junior Full Stack Developer"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Drive Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active (Open for Candidate Entry)</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Start Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">End Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Job Description</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Job description, responsibilities, work location, and benefits..."
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Question Papers Assignment */}
        <div className="card custom-card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Select Examination Paper(s) *</h5>
            <Link to="/admin/question-papers/create" className="btn btn-sm btn-outline-primary">
              Create New Paper
            </Link>
          </div>

          <p className="text-muted small mb-3">
            Select the published question paper that candidates will take when attempting this drive's examination:
          </p>

          {publishedPapers.length === 0 ? (
            <div className="alert alert-warning py-3 small">
              No published question papers available.{' '}
              <Link to="/admin/question-papers/create" className="fw-semibold">
                Please create and publish a question paper first
              </Link>
              .
            </div>
          ) : (
            <div className="row g-3">
              {publishedPapers.map((paper) => {
                const isSelected = formData.selectedPapers.includes(paper._id);
                return (
                  <div key={paper._id} className="col-md-6">
                    <div
                      className={`p-3 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer ${
                        isSelected ? 'bg-primary-subtle border-primary' : 'bg-light'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleTogglePaper(paper._id)}
                    >
                      <div>
                        <div className="fw-bold text-dark">{paper.title}</div>
                        <div className="text-muted small">
                          Subject: {paper.subject?.name || 'N/A'} | Questions: {paper.questionCount} | Marks: {paper.totalMarks}
                        </div>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePaper(paper._id)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="row g-3 mt-3 pt-3 border-top">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Exam Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={formData.totalDuration}
                onChange={(e) => setFormData({ ...formData, totalDuration: Number(e.target.value) })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Passing Threshold Percentage (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                className="form-control"
                value={formData.passingCriteria.minPercentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passingCriteria: { ...formData.passingCriteria, minPercentage: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Maximum Attempts Allowed per Student</label>
              <input
                type="number"
                min="1"
                max="5"
                className="form-control"
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Recruitment Pipeline Stages Configuration */}
        <div className="card custom-card p-4 mb-4">
          <h5 className="fw-bold mb-2">Recruitment Pipeline Stages</h5>
          <p className="text-muted small mb-3">
            Configure the sequential interview rounds that shortlisted candidates will advance through:
          </p>

          <div className="d-flex flex-column gap-2 mb-3">
            {formData.stages.map((stage, idx) => (
              <div key={idx} className="p-2 px-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <span className="badge bg-primary text-white rounded-circle" style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idx + 1}
                  </span>
                  <span className="fw-semibold small">{stage}</span>
                </div>
                {formData.stages.length > 2 && idx > 0 && idx < formData.stages.length - 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger p-1"
                    onClick={() => handleRemoveStage(idx)}
                    title="Remove Stage"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Add custom interview round (e.g. System Design Round)..."
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
            />
            <button type="button" className="btn btn-outline-primary" onClick={handleAddStage}>
              <Plus size={16} /> Add Stage
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <Link to="/admin/drives" className="btn btn-outline-custom">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary-custom" disabled={submitting}>
            {submitting ? 'Saving Drive...' : 'Save & Launch Drive'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriveEditor;
