
import React, { useState } from 'react';
import { UserCircleIcon } from './shared/icons/HeroIcons'; // Using UserCircleIcon as a generic login icon

interface LoginPageProps {
  onLogin: (userId: string, username: string) => void;
  appError: string | null;
  clearAppError: () => void;
}

const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, appError, clearAppError }) => {
  const [userIdInput, setUserIdInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearAppError(); // Clear any global app errors first
    setFormError(null);

    const trimmedUserId = userIdInput.trim();
    const trimmedUsername = usernameInput.trim();

    if (!trimmedUserId) {
      setFormError("User ID is required.");
      return;
    }
    if (!isValidUUID(trimmedUserId)) {
        setFormError("User ID must be a valid UUID (e.g., a1b2c3d4-e5f6-7890-1234-567890abcdef).");
        return;
    }
    if (!trimmedUsername) {
      setFormError("Username is required.");
      return;
    }
    
    onLogin(trimmedUserId, trimmedUsername);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <UserCircleIcon className="w-16 h-16 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-primary">Welcome Back!</h1>
            <p className="text-base-content-secondary mt-1">Enter your User ID and Username to continue.</p>
        </div>

        {appError && (
            <div role="alert" className="alert alert-error bg-error/20 text-error-content p-3 rounded-md mb-4 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{appError}</span>
                 <button onClick={clearAppError} className="ml-auto text-xs font-semibold hover:underline">Dismiss</button>
            </div>
        )}
         {formError && (
            <div role="alert" className="alert alert-warning bg-warning/20 text-warning-content p-3 rounded-md mb-4 text-sm">
                 <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span>{formError}</span>
            </div>
        )}

        <div className="bg-base-200 shadow-xl rounded-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-base-content-secondary mb-1">
                User ID (UUID)
              </label>
              <input
                id="userId"
                name="userId"
                type="password"
                autoComplete="off"
                required
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="Enter your User ID (UUID)"
                className="mt-1 block w-full bg-base-100 border border-base-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-base-content-secondary mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your username"
                className="mt-1 block w-full bg-base-100 border border-base-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            
            <p className="text-xs text-base-content-secondary">
                Note: This is a simplified login for local use. User ID must be an existing ID in your Supabase 'profiles' table.
            </p>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus"
              >
                Login
              </button>
            </div>
          </form>
        </div>
         <p className="mt-8 text-center text-xs text-base-content-secondary">
            Sumber Rejeki &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
