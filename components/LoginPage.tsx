import React, { useState } from 'react';

const DiamondIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.0001 23.3137L3.9292 13.0435C3.33934 12.2882 3.00006 11.3787 3.00006 10.4357V4.71795C3.00006 3.96428 3.51868 3.29413 4.24271 3.12581L11.2427 1.3401C11.7246 1.22129 12.2756 1.22129 12.7575 1.3401L19.7575 3.12581C20.4815 3.29413 21.0001 3.96428 21.0001 4.71795V10.4357C21.0001 11.3787 20.6608 12.2882 20.0709 13.0435L12.0001 23.3137Z" />
    </svg>
);

interface LoginPageProps {
  onLogin: (userId: string) => void;
  appError: string | null;
  clearAppError: () => void;
}

const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, appError, clearAppError }) => {
  const [userIdInput, setUserIdInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearAppError(); 
    setFormError(null);

    const trimmedUserId = userIdInput.trim();

    if (!trimmedUserId) {
      setFormError("User ID is required.");
      return;
    }
    if (!isValidUUID(trimmedUserId)) {
        setFormError("User ID must be a valid UUID (e.g., a1b2c3d4-e5f6-7890-1234-567890abcdef).");
        return;
    }
    
    onLogin(trimmedUserId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent p-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <DiamondIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-base-content">Airdrop Task Tracker</h1>
            <p className="text-base-content-secondary mt-2">Enter your User ID to access your dashboard.</p>
        </div>

        {appError && (
            <div role="alert" className="alert alert-error bg-error/20 text-error-content p-3 rounded-lg mb-6 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{appError}</span>
                 <button onClick={clearAppError} className="ml-auto text-xs font-semibold hover:underline">Dismiss</button>
            </div>
        )}
         {formError && (
            <div role="alert" className="alert alert-warning bg-warning/20 text-warning-content p-3 rounded-lg mb-6 text-sm flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span>{formError}</span>
            </div>
        )}

        <div className="bg-base-200/50 backdrop-blur-md border border-base-300/50 shadow-2xl rounded-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-base-content-secondary mb-2">
                User ID (UUID)
              </label>
              <input
                id="userId"
                name="userId"
                type="password" 
                autoComplete="current-password"
                required
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="Paste your User ID here"
                className="mt-1 block w-full bg-base-100/70 border border-base-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            
            <p className="text-xs text-base-content-secondary/80">
                This is your unique identifier from the Supabase 'profiles' table. It is stored locally in your browser.
            </p>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-primary hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-primary-focus transition-all hover:shadow-glow-primary"
              >
                Login & Access Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
