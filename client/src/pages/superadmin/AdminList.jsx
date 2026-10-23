import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Briefcase,
  X,
} from 'lucide-react';

const AdminList = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password Reset Modal State
  const [resetModalAdmin, setResetModalAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  // View Details Modal State
  const [detailModalAdmin, setDetailModalAdmin] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchAdmins = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/superadmin/admins', {
        params: {
          search,
          status: statusFilter,
          page,
          limit: 10,
        },
      });
      if (res.data.success) {
        setAdmins(res.data.admins);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admin accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdmins(1);
  };

  const handleToggleStatus = async (admin) => {
    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    try {
      setError('');
      const res = await axiosClient.put(`/superadmin/admins/${admin._id}`, {
        status: newStatus,
      });
      if (res.data.success) {
        setSuccess(`Admin ${admin.name} marked as ${newStatus}`);
        fetchAdmins(pagination.page);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update admin status');
    }
  };

  const handleOpenResetModal = (admin) => {
    setResetModalAdmin(admin);
    setNewPassword('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      setResetting(true);
      setError('');
      const res = await axiosClient.put(`/superadmin/admins/${resetModalAdmin._id}/reset-password`, {
        newPassword,
      });
      if (res.data.success) {
        setSuccess(res.data.message);
        setResetModalAdmin(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const handleOpenDetails = async (adminId) => {
    try {
      setLoadingDetails(true);
      const res = await axiosClient.get(`/superadmin/admins/${adminId}`);
      if (res.data.success) {
        setDetailModalAdmin(res.data.admin);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin details');
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Admin Management</h2>
          <p className="text-muted small mb-0">Create, activate/deactivate, and inspect all recruitment administrator accounts</p>
        </div>
        <Link to="/superadmin/admins/create" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <UserPlus size={18} /> Create New Admin
        </Link>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} type="danger" />
      <AlertMessage message={success} onClose={() => setSuccess('')} type="success" />

      {/* Filters & Search */}
      <div className="card custom-card p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-md-6 col-lg-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by name, email, or phone..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
          <LoadingSpinner text="Fetching administrator accounts..." />
        ) : admins.length === 0 ? (
          <div className="text-center py-5 text-muted small">No administrator accounts match your criteria.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Administrator</th>
                  <th className="py-3">Contact</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Created</th>
                  <th className="py-3 text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm) => (
                  <tr key={adm._id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary-subtle text-primary fw-bold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                          {adm.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold text-dark">{adm.name}</div>
                          <div className="text-muted small">{adm.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-muted small">{adm.phone || 'N/A'}</td>
                    <td className="py-3">
                      <span className={`badge-custom badge-${adm.status}`}>
                        {adm.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted small">
                      {new Date(adm.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-end px-4">
                      <div className="d-inline-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-custom"
                          title="View Details & Drives"
                          onClick={() => handleOpenDetails(adm._id)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-warning"
                          title="Reset Password"
                          onClick={() => handleOpenResetModal(adm)}
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          className={`btn btn-sm ${adm.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          title={adm.status === 'active' ? 'Deactivate Admin' : 'Activate Admin'}
                          onClick={() => handleToggleStatus(adm)}
                        >
                          {adm.status === 'active' ? <XCircle size={15} /> : <CheckCircle size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <span className="small text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm btn-outline-custom"
                disabled={pagination.page <= 1}
                onClick={() => fetchAdmins(pagination.page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-custom"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchAdmins(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resetModalAdmin && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Reset Admin Password</h5>
                <button type="button" className="btn-close" onClick={() => setResetModalAdmin(null)}></button>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body">
                  <p className="small text-muted mb-3">
                    Set a new password for administrator <strong>{resetModalAdmin.name}</strong> ({resetModalAdmin.email}).
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">New Password *</label>
                    <div className="input-group">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        className="form-control border-end-0"
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="input-group-text bg-light border-start-0 text-muted"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        style={{ cursor: 'pointer' }}
                        aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                        title={showResetPassword ? 'Hide password' : 'Show password'}
                      >
                        {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setResetModalAdmin(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-custom" disabled={resetting}>
                    {resetting ? 'Resetting...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin Details Modal */}
      {detailModalAdmin && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Admin Profile: {detailModalAdmin.name}</h5>
                <button type="button" className="btn-close" onClick={() => setDetailModalAdmin(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small">Email Address</div>
                      <div className="fw-semibold">{detailModalAdmin.email}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small">Account Status</div>
                      <div>
                        <span className={`badge-custom badge-${detailModalAdmin.status}`}>
                          {detailModalAdmin.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <Briefcase size={18} className="text-primary" /> Associated Recruitment Drives ({detailModalAdmin.drives?.length || 0})
                </h6>

                {detailModalAdmin.drives && detailModalAdmin.drives.length > 0 ? (
                  <div className="list-group">
                    {detailModalAdmin.drives.map((d) => (
                      <div key={d._id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{d.name}</div>
                          <div className="text-muted small">Role: {d.jobTitle} | Code: <span className="font-monospace fw-bold">{d.driveCode}</span></div>
                        </div>
                        <span className={`badge-custom badge-${d.status}`}>{d.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small">No recruitment drives created by this administrator yet.</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setDetailModalAdmin(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminList;
