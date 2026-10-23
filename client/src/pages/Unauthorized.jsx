import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { role } = useAuth();

  const getHomePath = () => {
    if (role === 'superadmin') return '/superadmin/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'student') return '/student/dashboard';
    return '/';
  };

  return (
    <div className="container py-5 text-center">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card custom-card p-5 border-0 shadow-sm">
            <div className="d-inline-flex p-3 rounded-circle bg-danger-subtle text-danger mb-3 mx-auto">
              <ShieldAlert size={48} />
            </div>
            <h2 className="fw-bold text-dark">403 Access Denied</h2>
            <p className="text-muted mb-4">
              You do not have the required role permissions to access this administrative resource. All platform permissions are verified and enforced by the server.
            </p>
            <div>
              <Link to={getHomePath()} className="btn btn-primary-custom d-inline-flex align-items-center gap-2">
                <ArrowLeft size={18} /> Return to Your Authorized Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
