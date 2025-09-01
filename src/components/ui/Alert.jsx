import React from 'react';

const Alert = ({ type = 'info', title, message, onClose, className = '' }) => {
  const alertStyles = {
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: 'text-emerald-600',
      title: 'text-emerald-800',
      message: 'text-emerald-700',
      closeButton: 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100'
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-600',
      title: 'text-red-800',
      message: 'text-red-700',
      closeButton: 'text-red-500 hover:text-red-700 hover:bg-red-100'
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: 'text-amber-600',
      title: 'text-amber-800',
      message: 'text-amber-700',
      closeButton: 'text-amber-500 hover:text-amber-700 hover:bg-amber-100'
    },
    info: {
      container: 'bg-slate-50 border-slate-200 text-slate-800',
      icon: 'text-slate-600',
      title: 'text-slate-800',
      message: 'text-slate-700',
      closeButton: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
    }
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const styles = alertStyles[type];

  return (
    <div className={`border rounded-xl p-4 shadow-lg ${styles.container} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={`text-xl ${styles.icon}`}>
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`text-base font-semibold mb-1 ${styles.title}`}>
              {title}
            </h4>
          )}
          {message && (
            <p className={`text-sm ${styles.message}`}>
              {message}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors duration-200 ${styles.closeButton}`}
            aria-label="Close alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
