import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import AlertMessage from '../components/AlertMessage';
import { User, Lock, Mail, Phone, School, GraduationCap, Save, KeyRound, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    college: user?.profile?.college || '',
    qualification: user?.profile?.qualification || '',
    graduationYear: user?.profile?.graduationYear || '',
    department: user?.profile?.department || '',
    bio: user?.profile?.bio || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ error: '', success: '' });
  const [passwordMsg, setPasswordMsg] = useState({ error: '', success: '' });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ error: '', success: '' });

    try {
      setProfileSaving(true);
      const res = await axiosClient.put('/auth/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
        profile: {
          college: profileForm.college,
          qualification: profileForm.qualification,
          graduationYear: profileForm.graduationYear ? Number(profileForm.graduationYear) : null,
          department: profileForm.department,
          bio: profileForm.bio,
        },
      });

      if (res.data.success) {
        updateUser(res.data.user);
        setProfileMsg({ error: '', success: 'Profile details updated successfully' });
      }
    } catch (err) {
      setProfileMsg({ error: err.response?.data?.message || 'Failed to update profile', success: '' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ error: '', success: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ error: 'New passwords do not match', success: '' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ error: 'New password must be at least 6 characters', success: '' });
      return;
    }

    try {
      setPasswordSaving(true);
      const res = await axiosClient.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.data.success) {
        setPasswordMsg({ error: '', success: 'Password changed successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordMsg({ error: err.response?.data?.message || 'Failed to change password', success: '' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Account & Profile Settings</h2>
        <p className="text-muted small">Manage your personal details and account credentials</p>
      </div>

      <div className="row g-4">
        {/* Profile Details Card */}
        <div className="col-lg-7">
          <div className="card custom-card p-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <User size={20} className="text-primary" /> Profile Information
            </h5>

            <AlertMessage message={profileMsg.error} type="danger" onClose={() => setProfileMsg({ ...profileMsg, error: '' })} />
            <AlertMessage message={profileMsg.success} type="success" onClose={() => setProfileMsg({ ...profileMsg, success: '' })} />

            <form onSubmit={handleProfileSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Email Address (Read Only)</label>
                  <input
                    type="email"
                    className="form-control bg-light"
                    value={user?.email || ''}
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Assigned Role</label>
                  <div className="pt-2">
                    <span className="badge-custom badge-shortlisted text-capitalize">
                      {user?.role}
                    </span>
                  </div>
                </div>

                {/* Student Specific Fields */}
                {user?.role === 'student' && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">College / University</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profileForm.college}
                        onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Degree / Qualification</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profileForm.qualification}
                        onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Graduation Year</label>
                      <input
                        type="number"
                        className="form-control"
                        value={profileForm.graduationYear}
                        onChange={(e) => setProfileForm({ ...profileForm, graduationYear: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Department</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 pt-3 border-top text-end">
                <button type="submit" className="btn btn-primary-custom d-inline-flex align-items-center gap-2" disabled={profileSaving}>
                  <Save size={16} /> {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="col-lg-5">
          <div className="card custom-card p-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <KeyRound size={20} className="text-warning" /> Change Password
            </h5>

            <AlertMessage message={passwordMsg.error} type="danger" onClose={() => setPasswordMsg({ ...passwordMsg, error: '' })} />
            <AlertMessage message={passwordMsg.success} type="success" onClose={() => setPasswordMsg({ ...passwordMsg, success: '' })} />

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Current Password *</label>
                <div className="input-group">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="form-control border-end-0"
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="input-group-text bg-light border-start-0 text-muted"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{ cursor: 'pointer' }}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">New Password *</label>
                <div className="input-group">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-control border-end-0"
                    placeholder="Minimum 6 characters"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="input-group-text bg-light border-start-0 text-muted"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ cursor: 'pointer' }}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Confirm New Password *</label>
                <div className="input-group">
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    className="form-control border-end-0"
                    placeholder="Re-type new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="input-group-text bg-light border-start-0 text-muted"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    style={{ cursor: 'pointer' }}
                    aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 text-end">
                <button type="submit" className="btn btn-outline-custom w-100" disabled={passwordSaving}>
                  {passwordSaving ? 'Updating Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
