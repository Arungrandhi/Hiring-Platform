import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AlertMessage from '../../components/AlertMessage';
import { UserPlus, User, Mail, Phone, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const CreateAdmin = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axiosClient.post('/superadmin/admins', formData);
      if (res.data.success) {
        navigate('/superadmin/admins');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create administrator account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <Link to="/superadmin/admins" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-2">
          <ArrowLeft size={16} /> Back to Admin Management
        </Link>
        <h2 className="fw-bold mb-1">Provision New Administrator</h2>
        <p className="text-muted small">Create an Admin account for managing subjects, question papers, and drives</p>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="card custom-card p-4 p-md-5">
            <AlertMessage message={error} onClose={() => setError('')} />

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Administrator Name *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <User size={16} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    name="name"
                    className="form-control border-start-0"
                    placeholder="e.g. Sarah Jenkins"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Email Address *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Mail size={16} className="text-muted" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    className="form-control border-start-0"
                    placeholder="admin@organization.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Contact Phone</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Phone size={16} className="text-muted" />
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control border-start-0"
                    placeholder="+1 (555) 015-5555"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">Initial Password *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Lock size={16} className="text-muted" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-control border-start-0 border-end-0"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="input-group-text bg-light border-start-0 text-muted"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ cursor: 'pointer' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <Link to="/superadmin/admins" className="btn btn-outline-custom">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary-custom" disabled={submitting}>
                  {submitting ? 'Creating Admin...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAdmin;
