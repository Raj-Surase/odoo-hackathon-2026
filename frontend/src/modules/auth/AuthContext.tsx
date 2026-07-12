import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Employee' | 'Dept Head' | 'Asset Manager' | 'Admin';
  department_id: number | null;
  status: 'Active' | 'Inactive';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string, departmentId: number) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Configure authentication headers and verify session on load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        // Set global API bearer header
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        try {
          // Fetch current verified user profile
          const response = await api.get('/user');
          setUser(response.data);
        } catch (error) {
          console.error('Session validation failed:', error);
          // Token is stale or invalid, clean up
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password });
      const { user: loggedInUser, token: authToken } = response.data;

      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(loggedInUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, departmentId: number) => {
    try {
      const response = await api.post('/register', {
        name,
        email,
        password,
        department_id: departmentId,
      });
      const { user: registeredUser, token: authToken } = response.data;

      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(registeredUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
