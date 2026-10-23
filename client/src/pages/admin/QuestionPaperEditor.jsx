import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  ArrowLeft,
  Save,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

const QuestionPaperEditor = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Paper Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    instructions: 'Read each question carefully before answering. Each correct answer carries marks as specified.',
    difficulty: 'Medium',
    duration: 30,
    passingMarks: 6,
    negativeMarking: {
      enabled: false,
      perQuestionPenalty: 0.5,
    },
    questions: [
      {
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        marks: 2,
        negativeMarks: 0.5,
        explanation: '',
      },
    ],
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const subjectsRes = await axiosClient.get('/subjects', { params: { status: 'active', limit: 100 } });
        if (subjectsRes.data.success) {
          setSubjects(subjectsRes.data.subjects);
          if (!isEditing && subjectsRes.data.subjects.length > 0) {
            setFormData((prev) => ({ ...prev, subject: subjectsRes.data.subjects[0]._id }));
          }
        }

        if (isEditing) {
          const paperRes = await axiosClient.get(`/question-papers/${id}`);
          if (paperRes.data.success) {
            const paper = paperRes.data.paper;
            setFormData({
              title: paper.title,
              subject: paper.subject?._id || paper.subject,
              instructions: paper.instructions || '',
              difficulty: paper.difficulty || 'Medium',
              duration: paper.duration || 30,
              passingMarks: paper.passingMarks || 0,
              negativeMarking: {
                enabled: paper.negativeMarking?.enabled || false,
                perQuestionPenalty: paper.negativeMarking?.perQuestionPenalty || 0,
              },
              questions: paper.questions && paper.questions.length > 0 ? paper.questions : [
                {
                  questionText: '',
                  options: ['', '', '', ''],
                  correctAnswer: 0,
                  marks: 1,
                  negativeMarks: 0,
                  explanation: '',
                },
              ],
            });
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to initialize paper editor');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id, isEditing]);

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          marks: 1,
          negativeMarks: formData.negativeMarking.enabled ? formData.negativeMarking.perQuestionPenalty : 0,
          explanation: '',
        },
      ],
    });
  };

  const handleRemoveQuestion = (index) => {
    if (formData.questions.length <= 1) {
      setError('Paper must have at least one question');
      return;
    }
    const updated = formData.questions.filter((_, idx) => idx !== index);
    setFormData({ ...formData, questions: updated });
  };

  const handleQuestionChange = (qIndex, field, value) => {
    const updated = [...formData.questions];
    updated[qIndex][field] = value;
    setFormData({ ...formData, questions: updated });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...formData.questions];
    updated[qIndex].options[optIndex] = value;
    setFormData({ ...formData, questions: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.title.trim()) {
      setError('Paper title is required');
      return;
    }

    if (!formData.subject) {
      setError('Please assign a subject to this paper');
      return;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.questionText.trim()) {
        setError(`Question #${i + 1} text cannot be empty`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!String(q.options[j]).trim()) {
          setError(`Question #${i + 1}, Option ${j + 1} is empty`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await axiosClient.put(`/question-papers/${id}`, formData);
      } else {
        await axiosClient.post('/question-papers', formData);
      }
      navigate('/admin/question-papers');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save question paper');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading paper content..." />;

  const calculatedTotalMarks = formData.questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="mb-4">
        <Link to="/admin/question-papers" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-2">
          <ArrowLeft size={16} /> Back to Question Papers
        </Link>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h2 className="fw-bold mb-1">{isEditing ? 'Edit Question Paper' : 'Create Question Paper'}</h2>
            <p className="text-muted small mb-0">Configure test parameters, scoring policy, and multiple choice questions</p>
          </div>
          <button type="button" onClick={handleSubmit} className="btn btn-primary-custom d-flex align-items-center gap-2" disabled={submitting}>
            <Save size={18} /> {submitting ? 'Saving...' : 'Save Paper'}
          </button>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      <form onSubmit={handleSubmit}>
        {/* Paper Settings Card */}
        <div className="card custom-card p-4 mb-4">
          <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <FileText size={20} className="text-primary" /> Examination Parameters
          </h5>

          <div className="row g-3">
            <div className="col-md-8">
              <label className="form-label small fw-semibold">Paper Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Full Stack Engineering Core Assessment"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Subject *</label>
              <select
                className="form-select"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
              {subjects.length === 0 && (
                <div className="form-text text-danger mt-1 small">
                  No subjects found. Please <Link to="/admin/subjects" className="fw-semibold">create a subject</Link> first.
                </div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold">Duration (Minutes) *</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold">Difficulty Level</label>
              <select
                className="form-select"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold">Total Calculated Marks</label>
              <div className="form-control bg-light fw-bold text-primary">
                {calculatedTotalMarks} Marks ({formData.questions.length} Questions)
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold">Passing Marks</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={formData.passingMarks}
                onChange={(e) => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                required
              />
            </div>

            {/* Negative Marking Configuration */}
            <div className="col-md-6">
              <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-semibold small">Negative Marking</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Deduct marks for incorrect candidate selections</div>
                </div>
                <div className="form-check form-switch fs-5">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.negativeMarking.enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        negativeMarking: { ...formData.negativeMarking, enabled: e.target.checked },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {formData.negativeMarking.enabled && (
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Negative Penalty per Wrong Answer</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  className="form-control"
                  value={formData.negativeMarking.perQuestionPenalty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      negativeMarking: {
                        ...formData.negativeMarking,
                        perQuestionPenalty: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            )}

            <div className="col-12">
              <label className="form-label small fw-semibold">Instructions for Candidate</label>
              <textarea
                className="form-control"
                rows={2}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Questions Builder */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Examination Questions ({formData.questions.length})</h5>
            <button
              type="button"
              className="btn btn-outline-primary d-flex align-items-center gap-1 btn-sm"
              onClick={handleAddQuestion}
            >
              <Plus size={16} /> Add Question
            </button>
          </div>

          <div className="d-flex flex-column gap-3">
            {formData.questions.map((q, qIndex) => (
              <div key={qIndex} className="card custom-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="badge bg-primary text-white px-3 py-1 rounded-pill">
                    Question #{qIndex + 1}
                  </span>
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <label className="small fw-semibold text-muted mb-0">Marks:</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        style={{ width: 70 }}
                        className="form-control form-control-sm"
                        value={q.marks}
                        onChange={(e) => handleQuestionChange(qIndex, 'marks', Number(e.target.value))}
                      />
                    </div>
                    {formData.questions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger p-1"
                        title="Delete Question"
                        onClick={() => handleRemoveQuestion(qIndex)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Question Prompt *</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Enter the question statement clearly..."
                    value={q.questionText}
                    onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                    required
                  />
                </div>

                {/* 4 Options */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold d-flex justify-content-between">
                    <span>Answer Options (Select the radio of the correct choice) *</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Correct answer key is securely hidden from candidates during exam</span>
                  </label>

                  <div className="row g-2">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="col-md-6">
                        <div className={`input-group ${q.correctAnswer === optIndex ? 'border-primary' : ''}`}>
                          <div className="input-group-text bg-light">
                            <input
                              className="form-check-input mt-0"
                              type="radio"
                              name={`correct_${qIndex}`}
                              checked={q.correctAnswer === optIndex}
                              onChange={() => handleQuestionChange(qIndex, 'correctAnswer', optIndex)}
                              title="Mark as correct answer"
                            />
                            <span className="ms-2 small fw-bold text-muted">
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)} text`}
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Explanation */}
                <div>
                  <label className="form-label small fw-semibold">Explanation / Solution Note (Optional)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Rationale for the correct option (visible only to administrators during review)..."
                    value={q.explanation || ''}
                    onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-3">
            <button
              type="button"
              className="btn btn-outline-primary d-inline-flex align-items-center gap-1"
              onClick={handleAddQuestion}
            >
              <Plus size={16} /> Add Another Question
            </button>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <Link to="/admin/question-papers" className="btn btn-outline-custom">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary-custom" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Question Paper'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionPaperEditor;
