import React from 'react';

const LoadingSpinner = ({ text = 'Loading...', size = 'md' }) => {
  const spinnerClass = size === 'sm' ? 'spinner-border-sm' : '';

  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-4">
      <div className={`spinner-border text-primary ${spinnerClass}`} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && <p className="mt-2 text-muted small mb-0">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
