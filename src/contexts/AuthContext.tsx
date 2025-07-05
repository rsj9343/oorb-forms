import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  preferences: {
    theme: string;
    notifications: boolean;
    language: string;
  };
  createdAt: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<boolean>;
  getInitials: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Checking auth status, token exists:', !!token);
      
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          console.log('Auth check successful:', response.data);
          setUser(response.data);
        } catch (error: any) {
          console.error('Token validation failed:', error.response?.data || error.message);
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        console.log('No token found');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      const response = await authAPI.login({ email, password });
      const { token, user: userData } = response.data;
      
      console.log('Login response received:', { 
        hasToken: !!token, 
        hasUser: !!userData,
        userName: userData?.name 
      });
      
      if (!token || !userData) {
        throw new Error('Invalid response from server');
      }
      
      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      
      console.log('Login successful, user state updated');
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting registration for:', email);
      const response = await authAPI.register({ name, email, password });
      const { token, user: userData } = response.data;
      
      console.log('Registration response received:', { 
        hasToken: !!token, 
        hasUser: !!userData,
        userName: userData?.name 
      });
      
      if (!token || !userData) {
        throw new Error('Invalid response from server');
      }
      
      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      
      console.log('Registration successful, user state updated');
      toast.success('Registration successful!');
      return true;
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData: any): Promise<boolean> => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.user);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Profile updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.error || 'Profile update failed');
      return false;
    }
  };

  const getInitials = (): string => {
    if (!user) return 'U';
    return user.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    getInitials
  };

  console.log('AuthContext state:', { 
    hasUser: !!user, 
    loading, 
    userName: user?.name 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};