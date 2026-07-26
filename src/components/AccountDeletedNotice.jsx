import React from 'react';

const AccountDeletedNotice = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-slate-100">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-4">Account Deleted</h1>
          <p className="text-slate-600 mb-8">
            This account and its personal data have been removed. If this wasn't you, or you'd like to
            book with Morales again, please contact us.
          </p>
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600">
            <a href="mailto:info@moralesconcierge.com" className="text-slate-700 underline">
              info@moralesconcierge.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletedNotice;
