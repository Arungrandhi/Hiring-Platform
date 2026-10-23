import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import { BookOpen, Plus, Search, Edit2, CheckCircle, XCircle } from 'lucide-react';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [modalForm, setModalForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/subjects', { params: { search } });
      if (res.data.success) {
        setSubjects(res.data.subjects);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSubjects();
  };

  const handleOpenCreateModal = () => {
    setEditingSubject(null);
    setModalForm({ name: '', code: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sub) => {
    setEditingSubject(sub);
    setModalForm({
      name: sub.name,
      code: sub.code || '',
      description: sub.description || '',
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      setError('Subject name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      if (editingSubject) {
        const res = await axiosClient.put(`/subjects/${editingSubject._id}`, modalForm);
        if (res.data.success) {
          setSuccess('Subject updated successfully');
        }
      } else {
        const res = await axiosClient.post('/subjects', modalForm);
        if (res.data.success) {
          setSuccess('Subject created successfully');
        }
      }
      setIsModalOpen(false);
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (sub) => {
    try {
      setError('');
      const res = await axiosClient.patch(`/subjects/${sub._id}/toggle-status`);
      if (res.data.success) {
        setSuccess(res.data.message);
        fetchSubjects();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle subject status');
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Subject Management</h2>
          <p className="text-muted small mb-0">Define academic & technical subjects used to categorize examination papers</p>
        </div>
        <button className="btn btn-primary-custom d-flex align-items-center gap-2" onClick={handleOpenCreateModal}>
          <Plus size={18} /> Add New Subject
        </button>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} type="danger" />
      <AlertMessage message={success} onClose={() => setSuccess('')} type="success" />

      {/* Search */}
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
                placeholder="Search subject by name, code, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-auto">
            <button type="submit" className="btn btn-outline-custom">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card custom-card overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Fetching subjects..." />
        ) : subjects.length === 0 ? (
          <div className="text-center py-5 text-muted small">No subjects found. Create your first subject above.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Subject Name</th>
                  <th className="py-3">Code</th>
                  <th className="py-3">Description</th>
                  <th className="py-3">Question Papers</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub) => (
                  <tr key={sub._id}>
                    <td className="px-4 py-3">
                      <div className="fw-semibold text-dark">{sub.name}</div>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-light text-dark font-monospace border">
                        {sub.code || '-'}
                      </span>
                    </td>
                    <td className="py-3 text-muted small" style={{ maxWidth: 280 }}>
                      <div className="text-truncate">{sub.description || '-'}</div>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-primary-subtle text-primary">
                        {sub.paperCount || 0} Papers
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`badge-custom badge-${sub.status}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 text-end px-4">
                      <div className="d-inline-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-custom"
                          title="Edit Subject"
                          onClick={() => handleOpenEditModal(sub)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className={`btn btn-sm ${sub.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          title={sub.status === 'active' ? 'Deactivate Subject' : 'Activate Subject'}
                          onClick={() => handleToggleStatus(sub)}
                        >
                          {sub.status === 'active' ? <XCircle size={15} /> : <CheckCircle size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingSubject ? 'Edit Subject' : 'Create New Subject'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)}></button>
              </div>
              <form onSubmit={handleModalSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Subject Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Full Stack Web Development"
                      value={modalForm.name}
                      onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Subject Code</label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      placeholder="e.g. CS-FSW"
                      value={modalForm.code}
                      onChange={(e) => setModalForm({ ...modalForm, code: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Brief overview of subject coverage..."
                      value={modalForm.description}
                      onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-custom" disabled={saving}>
                    {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;
