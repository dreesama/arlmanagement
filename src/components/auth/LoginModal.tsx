import React, { useState } from 'react';
import { Lock, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../lib/api';
import { Logo } from '../ui/Logo';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login({ username, password });
      if (res.success) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md bg-white border-2 border-[#E5E0D8] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Banner with LOGO.svg */}
        <div className="bg-[#1C1B18] px-6 py-8 text-center text-white relative flex flex-col items-center">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/20 mb-3 shadow-lg">
            <Logo size={36} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ARL's Hotel</h1>
          <p className="text-xs text-[#6E6B65] mt-0.5 font-medium">Admin Portal Sign In</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#1C1B18]">Welcome Back</h2>
            <p className="text-xs text-[#6E6B65] font-medium">Please authenticate to access system dashboard.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FDF2F0] border border-[#F8C8C1] text-[#992E1B] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6B65]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 zen-input text-xs text-[#1C1B18] placeholder-[#6E6B65]"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6B65]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 zen-input text-xs text-[#1C1B18] placeholder-[#6E6B65]"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] text-[11px] text-[#6E6B65] space-y-1">
            <div className="font-bold text-[#1C1B18] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C84B31]" /> Default Credentials:
            </div>
            <div>Username: <code className="text-[#C84B31] bg-white px-1.5 py-0.5 rounded border border-[#E5E0D8] font-mono">admin</code></div>
            <div>Password: <code className="text-[#C84B31] bg-white px-1.5 py-0.5 rounded border border-[#E5E0D8] font-mono">admin123</code></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 zen-btn-primary font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
