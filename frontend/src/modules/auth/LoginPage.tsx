import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to the page they were trying to access, or dashboard
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans select-none relative overflow-hidden px-4">
      {/* Premium glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366f1]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#a855f7]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full z-10 space-y-6">
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Logo className="scale-110" />
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Sign in to manage your corporate assets
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-[0_8px_30px_hsla(0,0%,0%,0.5)] backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 bg-destructive/15 border border-destructive/30 text-destructive-foreground rounded-2xl flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-secondary border border-border hover:border-border-color focus:border-primary/80 focus:ring-2 focus:ring-primary/20 text-white rounded-2xl py-3 px-4 outline-none transition-all duration-200 placeholder:text-muted-foreground/40 text-sm font-sans"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Password
                </label>
                <a href="#forgot" className="text-xs text-primary hover:text-primary-foreground font-semibold transition-all duration-200">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-secondary border border-border hover:border-border-color focus:border-primary/80 focus:ring-2 focus:ring-primary/20 text-white rounded-2xl py-3 px-4 outline-none transition-all duration-200 placeholder:text-muted-foreground/40 text-sm font-sans pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-white transition-all duration-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-95 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 mt-2 shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Log in</span>
              )}
            </button>
          </form>

          {/* Registration Redirect */}
          <div className="mt-8 text-center border-t border-border/40 pt-6">
            <p className="text-xs text-muted-foreground font-medium">
              New to the platform?{' '}
              <Link to="/register" className="text-primary hover:text-primary-foreground font-bold transition-all duration-200">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
