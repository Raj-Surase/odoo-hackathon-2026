import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { api } from '@/lib/api';
import { AlertCircle, ShieldAlert, Loader2, Eye, EyeOff } from 'lucide-react';

interface Department {
  id: number;
  name: string;
}

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);

  // Fetch active departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/departments');
        setDepartments(response.data);
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setIsLoadingDepts(false);
      }
    };

    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    setIsSubmitting(true);

    if (!departmentId) {
      setError('Please select a department');
      setIsSubmitting(false);
      return;
    }

    try {
      await register(name, email, password, parseInt(departmentId, 10));
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data) {
        const responseData = err.response.data;
        if (responseData.errors) {
          setValidationErrors(responseData.errors);
        }
        setError(responseData.message || 'Registration failed. Please check the fields.');
      } else {
        setError('Something went wrong during registration.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans select-none relative overflow-hidden px-4 py-8">
      {/* Premium glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366f1]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#a855f7]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full z-10 space-y-6">
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Logo className="scale-110" />
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Create your account
            </h2>
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Join the AssetFlow platform
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-[0_8px_30px_hsla(0,0%,0%,0.5)] backdrop-blur-xl">
          {/* Warning Banner about default Employee role */}
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <div className="text-xs font-medium leading-relaxed">
              <strong>Employee Account Signup:</strong> All new registrations default to the <strong>Employee</strong> role. Administrative and manager privileges can only be elevated later by system administrators.
            </div>
          </div>

          {error && !Object.keys(validationErrors).length && (
            <div className="mb-6 p-4 bg-destructive/15 border border-destructive/30 text-destructive-foreground rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className={`w-full bg-secondary border ${validationErrors.name ? 'border-destructive' : 'border-border'} hover:border-border-color focus:border-primary/80 focus:ring-2 focus:ring-primary/20 text-white rounded-2xl py-3 px-4 outline-none transition-all duration-200 text-sm placeholder:text-muted-foreground/45`}
              />
              {validationErrors.name && (
                <p className="text-[10px] text-destructive font-semibold mt-1 pl-1">{validationErrors.name[0]}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1">
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
                className={`w-full bg-secondary border ${validationErrors.email ? 'border-destructive' : 'border-border'} hover:border-border-color focus:border-primary/80 focus:ring-2 focus:ring-primary/20 text-white rounded-2xl py-3 px-4 outline-none transition-all duration-200 text-sm placeholder:text-muted-foreground/45`}
              />
              {validationErrors.email && (
                <p className="text-[10px] text-destructive font-semibold mt-1 pl-1">{validationErrors.email[0]}</p>
              )}
            </div>

            {/* Department Picker */}
            <div className="space-y-1">
              <label htmlFor="department" className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Department
              </label>
              <select
                id="department"
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={`w-full bg-secondary border ${validationErrors.department_id ? 'border-destructive' : 'border-border'} hover:border-border-color focus:border-primary/80 focus:ring-2 focus:ring-primary/20 text-white rounded-2xl py-3 px-4 outline-none transition-all duration-200 text-sm cursor-pointer`}
              >
                <option value="" disabled>
                  {isLoadingDepts ? 'Loading departments...' : 'Select your department'}
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {validationErrors.department_id && (
                <p className="text-[10px] text-destructive font-semibold mt-1 pl-1">{validationErrors.department_id[0]}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-secondary border ${validationErrors.password ? 'border-destructive' : 'border-border'} hover:border-border-color focus:border-primary/80 focus:ring-2 focus:ring-primary/20 text-white rounded-2xl py-3 px-4 outline-none transition-all duration-200 text-sm pr-12 placeholder:text-muted-foreground/45`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-white transition-all duration-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {validationErrors.password ? (
                <p className="text-[10px] text-destructive font-semibold mt-1 pl-1">{validationErrors.password[0]}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground/60 mt-1 pl-1">
                  At least 8 chars, 1 uppercase letter, 1 number, and 1 special symbol.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoadingDepts}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-95 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 mt-4 shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Login Redirect */}
          <div className="mt-8 text-center border-t border-border/40 pt-6">
            <p className="text-xs text-muted-foreground font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-primary-foreground font-bold transition-all duration-200">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
