import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="container py-5 text-center">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card custom-card p-5 border-0 shadow-sm">
            <div className="d-inline-flex p-3 rounded-circle bg-warning-subtle text-warning mb-3 mx-auto">
              <HelpCircle size={48} />
            </div>
            <h2 className="fw-bold text-dark">404 - Page Not Found</h2>
            <p className="text-muted mb-4">
              The requested recruitment or examination page does not exist or may have been moved.
            </p>
            <div>
              <Link to="/" className="btn btn-primary-custom d-inline-flex align-items-center gap-2">
                <ArrowLeft size={18} /> Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
