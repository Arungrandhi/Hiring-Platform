import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit2,
  CheckCircle,
  Archive,
  Clock,
  Award,
} from 'lucide-react';

const QuestionPapers = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/question-papers', {
        params: { search, status: statusFilter },
      });
      if (res.data.success) {
        setPapers(res.data.papers);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch question papers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPapers();
  };

  const handlePublish = async (paperId) => {
    try {
      setError('');
      const res = await axiosClient.patch(`/question-papers/${paperId}/publish`);
      if (res.data.success) {
        setSuccess('Question paper published successfully and is now ready for recruitment drives');
        fetchPapers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish paper. Ensure it has at least 1 valid question.');
    }
  };

  const handleArchive = async (paperId) => {
    try {
      setError('');
      const res = await axiosClient.patch(`/question-papers/${paperId}/archive`);
      if (res.data.success) {
        setSuccess('Question paper moved to archive');
        fetchPapers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to archive paper');
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Question Papers</h2>
          <p className="text-muted small mb-0">Design and publish subject-wise multiple choice assessments</p>
        </div>
        <Link to="/admin/question-papers/create" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <Plus size={18} /> Create Question Paper
        </Link>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} type="danger" />
      <AlertMessage message={success} onClose={() => setSuccess('')} type="success" />

      {/* Filters */}
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
                placeholder="Search question papers by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4 col-lg-3">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="col-auto">
            <button type="submit" className="btn btn-outline-custom">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Papers Table */}
      <div className="card custom-card overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading question papers..." />
        ) : papers.length === 0 ? (
          <div className="text-center py-5 text-muted small">
            No question papers found.{' '}
            <Link to="/admin/question-papers/create" className="text-primary">
              Create your first question paper
            </Link>
            .
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Paper Title</th>
                  <th className="py-3">Subject</th>
                  <th className="py-3">Duration</th>
                  <th className="py-3">Questions & Marks</th>
                  <th className="py-3">Difficulty</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p._id}>
                    <td className="px-4 py-3">
                      <div className="fw-semibold text-dark">{p.title}</div>
                      <div className="text-muted small">Version {p.version || 1}</div>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-light text-dark border">
                        {p.subject?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3 text-muted small">
                      <div className="d-flex align-items-center gap-1">
                        <Clock size={14} /> {p.duration} mins
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <strong>{p.questionCount}</strong> Questions
                      </div>
                      <div className="text-muted small">Total: {p.totalMarks} marks</div>
                    </td>
                    <td className="py-3">
                      <span className={`badge bg-${p.difficulty === 'Easy' ? 'success' : p.difficulty === 'Medium' ? 'warning' : 'danger'}-subtle text-${p.difficulty === 'Easy' ? 'success' : p.difficulty === 'Medium' ? 'warning' : 'danger'}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`badge-custom badge-${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-end px-4">
                      <div className="d-inline-flex gap-1">
                        <Link
                          to={`/admin/question-papers/preview/${p._id}`}
                          className="btn btn-sm btn-outline-custom"
                          title="Preview Paper with Answers"
                        >
                          <Eye size={15} />
                        </Link>
                        {p.status === 'draft' && (
                          <>
                            <Link
                              to={`/admin/question-papers/edit/${p._id}`}
                              className="btn btn-sm btn-outline-primary"
                              title="Edit Paper"
                            >
                              <Edit2 size={15} />
                            </Link>
                            <button
                              className="btn btn-sm btn-outline-success"
                              title="Publish Paper"
                              onClick={() => handlePublish(p._id)}
                            >
                              <CheckCircle size={15} />
                            </button>
                          </>
                        )}
                        {p.status === 'published' && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Archive Paper"
                            onClick={() => handleArchive(p._id)}
                          >
                            <Archive size={15} />
                          </button>
                        )}
                      </div>
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

export default QuestionPapers;
