import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import { History, Search, Filter, Clock, ShieldCheck, User } from 'lucide-react';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState('');

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/superadmin/activities', {
        params: {
          actorRole: roleFilter,
          action: actionSearch,
          page,
          limit: 20,
        },
      });
      if (res.data.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Platform Activity Audit Trail</h2>
          <p className="text-muted small mb-0">Immutable system logs recording administrative, exam, and candidate actions</p>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {/* Filters */}
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
                placeholder="Search action keyword (e.g. DRIVE, EXAM)..."
                value={actionSearch}
                onChange={(e) => setActionSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-4 col-lg-3">
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Actor Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="col-auto">
            <button type="submit" className="btn btn-outline-custom">
              Filter Logs
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card custom-card overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading audit records..." />
        ) : logs.length === 0 ? (
          <div className="text-center py-5 text-muted small">No activity logs recorded matching this filter.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th className="px-3 py-3">Timestamp</th>
                  <th className="py-3">Actor</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Action</th>
                  <th className="py-3">Resource</th>
                  <th className="py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="px-3 py-3 text-muted text-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <div className="fw-semibold text-dark">{log.actorName || 'System'}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{log.actorEmail}</div>
                    </td>
                    <td className="py-3">
                      <span className={`badge-custom badge-${log.actorRole === 'superadmin' ? 'active' : log.actorRole === 'admin' ? 'shortlisted' : 'scheduled'}`}>
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-light text-dark border font-monospace">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="fw-medium">{log.resourceType}</span>
                      {log.resourceId && (
                        <div className="text-muted font-monospace" style={{ fontSize: '0.7rem' }}>
                          ID: {log.resourceId.substring(0, 10)}...
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-muted">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <code className="text-dark bg-light px-2 py-1 rounded" style={{ fontSize: '0.75rem' }}>
                          {JSON.stringify(log.metadata)}
                        </code>
                      ) : (
                        '-'
                      )}
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm btn-outline-custom"
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-custom"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
