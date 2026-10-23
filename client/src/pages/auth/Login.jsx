import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AlertMessage from '../../components/AlertMessage';
import { Award, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      const user = await login(email, password);

      // Redirect based on role or previous location
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'superadmin') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors ? Object.values(err.response.data.errors)[0] : null;
      setError(fieldError || err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const quickFill = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError('');
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card custom-card p-4 p-md-5 border-0 shadow-sm">
            <div className="text-center mb-4">
              <div className="d-inline-flex p-3 rounded-circle bg-primary-subtle text-primary mb-3">
                <Award size={36} />
              </div>
              <h3 className="fw-bold text-dark">Welcome to Saanvika Software Solutions</h3>
              <p className="text-muted small">Sign in with your role-authorized credentials</p>
            </div>

            <AlertMessage message={error} onClose={() => setError('')} />

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Mail size={16} className="text-muted" />
                  </span>
                  <input
                    type="email"
                    className="form-control border-start-0"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-semibold mb-0">Password</label>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Lock size={16} className="text-muted" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <button
                type="submit"
                className="btn btn-primary-custom w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                disabled={submitting}
              >
                {submitting ? 'Authenticating...' : 'Sign In'}
                {!submitting && <ArrowRight size={18} />}
              </button>
            </form>

            {/* Quick-Fill Demo Helpers */}
            <div className="mt-4 pt-3 border-top">
              <p className="small text-muted fw-semibold mb-2 text-center">Quick Demo Login Selector:</p>
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => quickFill('superadmin@hiringplatform.com', 'SuperAdmin@123')}
                >
                  Super Admin
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  onClick={() => quickFill('admin@techcorp.com', 'Admin@123')}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={() => quickFill('student@example.com', 'Student@123')}
                >
                  Student
                </button>
              </div>
            </div>

            <div className="text-center mt-4 pt-2">
              <p className="small text-muted mb-0">
                Are you a candidate without an account?{' '}
                <Link to="/register" className="fw-semibold text-primary text-decoration-none">
                  Register as Student
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
