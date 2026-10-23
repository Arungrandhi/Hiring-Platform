import React from 'react';
import { Award, ShieldCheck, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-auto">
      <div className="container py-3">
        <div className="row align-items-center justify-content-between g-2">
          <div className="col-md-6 d-flex align-items-center gap-2 flex-wrap">
            <Award size={20} className="text-primary flex-shrink-0" />
            <span className="fw-bold text-dark">Saanvika Software Solutions</span>
            <span className="text-muted small">| Hiring & Examination Platform</span>
          </div>
          <div className="col-md-6 text-md-end text-muted small d-flex align-items-center justify-content-md-end gap-3 flex-wrap">
            <span className="d-flex align-items-center gap-1">
              <ShieldCheck size={16} className="text-success" /> Server-Enforced RBAC
            </span>
            <span>© {new Date().getFullYear()} Saanvika Software Solutions</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
