import React from 'react';
import { Link } from 'react-router-dom';

const AuthForm = ({
  title,
  children,
  submitButtonText,
  submitButtonClasses,
  footerText,
  footerLinkText,
  footerLinkTo,
  onSubmit,
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-md bg-white bg-opacity-90 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">{title}</h2>
        <form onSubmit={onSubmit}>
          {children}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className={submitButtonClasses}
            >
              {submitButtonText}
            </button>
          </div>
        </form>
        <div className="mt-6 text-center">
          <span className="text-gray-700">{footerText} </span>
          <Link to={footerLinkTo} className="text-blue-500 hover:underline font-semibold">
            {footerLinkText}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;