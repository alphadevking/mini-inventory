import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, AuthResponse } from '../types/auth';

interface AuthContextType extends AuthState {
    login: (response: AuthResponse) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true,
    });

    useEffect(() => {
        const initAuth = async () => {
            const savedUser = localStorage.getItem('user');

            if (savedUser) {
                try {
                    // Fast path: trust localStorage initially to avoid flicker
                    const parsedUser = JSON.parse(savedUser);
                    setState({
                        user: parsedUser,
                        isAuthenticated: true,
                        isLoading: true, // Keep loading while we verify
                    });

                    // Verification path: fetch fresh user data (apiRequest handles refresh logic)
                    const { apiRequest } = await import('../lib/api');
                    const freshUser = await apiRequest<User>('/api/auth/me');

                    localStorage.setItem('user', JSON.stringify(freshUser));
                    setState({
                        user: freshUser,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (e) {
                    localStorage.removeItem('user');
                    setState({ user: null, isAuthenticated: false, isLoading: false });
                }
            } else {
                setState({ user: null, isAuthenticated: false, isLoading: false });
            }
        };

        initAuth();
    }, []);

    const login = (userData: User) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setState({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
        });
    };

    const logout = async () => {
        try {
            const { apiRequest } = await import('../lib/api');
            await apiRequest('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            // Even if backend logout fails, we clear local state
        }
        localStorage.removeItem('user');
        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });
    };

    const updateUser = (user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        setState(prev => ({ ...prev, user }));
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
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
