export type UserRole = 'admin' | 'manager' | 'technician' | 'cashier';

export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
    user_metadata: Record<string, unknown>;
}

export interface AuthResponse extends User { }

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
