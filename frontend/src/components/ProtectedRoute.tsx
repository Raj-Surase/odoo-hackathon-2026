import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext';
import { Logo } from '@/components/Logo';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans select-none relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0D21A1]/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="space-y-6 text-center z-10">
          <Logo className="h-10 mx-auto object-contain animate-pulse" />
          
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary animate-spin" />
            <div className="absolute inset-1.5 rounded-full border-b-2 border-l-2 border-accent animate-pulse" />
          </div>
          
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the location they were trying to access to redirect them back after logging in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
