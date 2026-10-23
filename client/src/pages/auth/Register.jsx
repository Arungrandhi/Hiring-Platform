import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AlertMessage from '../../components/AlertMessage';
import { Award, User, Mail, Phone, Lock, School, GraduationCap, Calendar, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    college: '',
    qualification: '',
    graduationYear: new Date().getFullYear(),
    department: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setSubmitting(true);
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        college: formData.college,
        qualification: formData.qualification,
        graduationYear: Number(formData.graduationYear),
        department: formData.department,
      });

      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-xl-7">
          <div className="card custom-card p-4 p-md-5 border-0 shadow-sm">
            <div className="text-center mb-4">
              <div className="d-inline-flex p-3 rounded-circle bg-primary-subtle text-primary mb-3">
                <Award size={36} />
              </div>
              <h3 className="fw-bold text-dark">Student Candidate Registration</h3>
              <p className="text-muted small">Create your candidate account to participate in Saanvika Software Solutions recruitment drives</p>
            </div>

            <AlertMessage message={error} onClose={() => setError('')} />

            <form onSubmit={handleRegister}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Full Name *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <User size={16} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      name="name"
                      className="form-control border-start-0"
                      placeholder="e.g. Jordan Smith"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Email Address *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Mail size={16} className="text-muted" />
                    </span>
                    <input
                      type="email"
                      name="email"
                      className="form-control border-start-0"
                      placeholder="jordan@university.edu"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Phone Number</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Phone size={16} className="text-muted" />
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      className="form-control border-start-0"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">College / University</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <School size={16} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      name="college"
                      className="form-control border-start-0"
                      placeholder="e.g. State University"
                      value={formData.college}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Qualification / Degree</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <GraduationCap size={16} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      name="qualification"
                      className="form-control border-start-0"
                      placeholder="e.g. B.Tech Computer Science"
                      value={formData.qualification}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Graduation Year</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Calendar size={16} className="text-muted" />
                    </span>
                    <input
                      type="number"
                      name="graduationYear"
                      className="form-control border-start-0"
                      placeholder="2026"
                      value={formData.graduationYear}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Department</label>
                  <input
                    type="text"
                    name="department"
                    className="form-control"
                    placeholder="CSE / IT / ECE"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Password *</label>
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

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Confirm Password *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Lock size={16} className="text-muted" />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      className="form-control border-start-0 border-end-0"
                      placeholder="Repeat password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    <button
                      type="button"
                      className="input-group-text bg-light border-start-0 text-muted"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ cursor: 'pointer' }}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="submit"
                  className="btn btn-primary-custom w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? 'Registering Account...' : 'Complete Registration'}
                  {!submitting && <ArrowRight size={18} />}
                </button>
              </div>
            </form>

            <div className="text-center mt-4 pt-2 border-top">
              <p className="small text-muted mb-0">
                Already have an account?{' '}
                <Link to="/login" className="fw-semibold text-primary text-decoration-none">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
