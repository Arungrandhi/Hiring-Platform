import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const AlertMessage = ({ type = 'danger', message, onClose, className = '' }) => {
  if (!message) return null;

  const icons = {
    danger: <AlertCircle size={18} className="me-2 flex-shrink-0" />,
    success: <CheckCircle size={18} className="me-2 flex-shrink-0" />,
    warning: <AlertCircle size={18} className="me-2 flex-shrink-0" />,
    info: <Info size={18} className="me-2 flex-shrink-0" />,
  };

  const alertVariant = type === 'error' ? 'danger' : type;

  return (
    <div
      className={`alert alert-${alertVariant} d-flex align-items-center justify-content-between py-2 px-3 mb-3 border-0 rounded-3 ${className}`}
      role="alert"
    >
      <div className="d-flex align-items-center">
        {icons[alertVariant] || icons.info}
        <span className="small">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          className="btn-close ms-2 p-1"
          style={{ fontSize: '0.65rem' }}
          onClick={onClose}
          aria-label="Close"
        />
      )}
    </div>
  );
};

export default AlertMessage;
