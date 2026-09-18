import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { ShieldCheck } from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot-password';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<Mode>('login');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('OFFICER');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setFullName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (mode === 'login') {
        if (!password) {
          setError('Please enter your password.');
          setIsSubmitting(false);
          return;
        }
        await login({ email, password });
        // The AppShell or ProtectedRoute will handle redirection based on role,
        // but as a fallback:
        navigate('/dashboard');
      } else if (mode === 'register') {
        if (!password || password.length < 12) {
          setError('Password must be at least 12 characters long.');
          setIsSubmitting(false);
          return;
        }
        if (!fullName) {
          setError('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        
        const res = await api.register({ email, password, full_name: fullName, role });
        setSuccess(res.message || 'Account created successfully. Please check your email.');
        // Optionally switch back to login mode after a short delay
        setTimeout(() => setMode('login'), 3000);
      } else if (mode === 'forgot-password') {
        const res = await api.forgotPassword({ email });
        setSuccess(res.message || 'Password reset link sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || `${mode === 'login' ? 'Login' : mode === 'register' ? 'Registration' : 'Request'} failed. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {mode === 'login' && 'Sign in to Pramaan'}
          {mode === 'register' && 'Create an Account'}
          {mode === 'forgot-password' && 'Reset Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          AI-Powered Bid Compliance Verification Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 p-3 rounded-md">
                {success}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="OFFICER">Tender Officer</option>
                    <option value="BIDDER">Bidder</option>
                    <option value="ADMIN">System Admin</option>
                    <option value="VIGILANCE">Vigilance Officer</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>

            {mode !== 'forgot-password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={mode === 'register' ? 'Minimum 12 characters' : 'Enter your password'}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => { resetForm(); setMode('forgot-password'); }}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : mode === 'login' ? 'Secure Sign In' : mode === 'register' ? 'Register' : 'Send Reset Link'}
              </button>
            </div>

            <div className="mt-6 text-center text-sm">
              {mode === 'login' ? (
                <span className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { resetForm(); setMode('register'); }}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { resetForm(); setMode('login'); }}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
