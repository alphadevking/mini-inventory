import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { apiRequest } from '../lib/api';
import { User } from '../types/auth';
import {
    Button,
    TextInput,
    PasswordInput,
    Select,
    Card,
    Title,
    Text,
    Stack,
    Container,
    Group,
    ThemeIcon,
    Anchor,
    Grid
} from '@mantine/core';
import { toast } from '../components/Toast';
import { UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'cashier',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
    });

    const navigate = useNavigate();

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateUsername = (username: string): boolean => {
        return username.trim().length >= 3;
    };

    const validatePassword = (password: string): boolean => {
        return password.length >= 6;
    };

    const validateFullName = (name: string): boolean => {
        return name.trim().length >= 2;
    };

    const clearError = (field: keyof typeof errors) => {
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setErrors({
            username: '',
            email: '',
            full_name: '',
            password: '',
        });

        // Validate all fields
        let hasErrors = false;

        if (!formData.username) {
            setErrors(prev => ({ ...prev, username: 'Please enter a username' }));
            hasErrors = true;
        } else if (!validateUsername(formData.username)) {
            setErrors(prev => ({ ...prev, username: 'Username must be at least 3 characters long' }));
            hasErrors = true;
        }

        if (!formData.email) {
            setErrors(prev => ({ ...prev, email: 'Please enter your email address' }));
            hasErrors = true;
        } else if (!validateEmail(formData.email)) {
            setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
            hasErrors = true;
        }

        if (!formData.full_name) {
            setErrors(prev => ({ ...prev, full_name: 'Please enter your full name' }));
            hasErrors = true;
        } else if (!validateFullName(formData.full_name)) {
            setErrors(prev => ({ ...prev, full_name: 'Please enter your full name' }));
            hasErrors = true;
        }

        if (!formData.password) {
            setErrors(prev => ({ ...prev, password: 'Please enter a password' }));
            hasErrors = true;
        } else if (!validatePassword(formData.password)) {
            setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters long' }));
            hasErrors = true;
        }

        if (hasErrors) {
            return;
        }

        setIsLoading(true);
        try {
            await apiRequest<User>('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(formData),
            });

            toast.success('Registration successful! You can now log in.');
            navigate('/login');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
            if (message.includes('username')) {
                setErrors(prev => ({ ...prev, username: message }));
            } else if (message.includes('email')) {
                setErrors(prev => ({ ...prev, email: message }));
            } else {
                setErrors(prev => ({ ...prev, password: message }));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container size={500} my={60}>
            <Card className="block-card" p={40}>
                <Stack align="center" mb="xl">
                    <ThemeIcon size={60} color="dark" variant="outline">
                        <ShieldCheck size={36} />
                    </ThemeIcon>
                    <Title order={1} className="section-title">New Operator</Title>
                    <Text color="dimmed" size="sm" ta="center" fw={500}>
                        REGISTER FOR INVENTORY ACCESS
                    </Text>
                </Stack>

                <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                        <Grid>
                            <Grid.Col span={6}>
                                <TextInput
                                    label="Username"
                                    placeholder="jdoe"
                                    required
                                    value={formData.username}
                                    onChange={(e) => {
                                        setFormData({ ...formData, username: e.target.value });
                                        clearError('username');
                                    }}
                                    error={errors.username}
                                    disabled={isLoading}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <TextInput
                                    label="Email Address"
                                    placeholder="john@example.com"
                                    required
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        clearError('email');
                                    }}
                                    error={errors.email}
                                    disabled={isLoading}
                                />
                            </Grid.Col>
                        </Grid>

                        <TextInput
                            label="Full Name"
                            placeholder="John Doe"
                            required
                            value={formData.full_name}
                            onChange={(e) => {
                                setFormData({ ...formData, full_name: e.target.value });
                                clearError('full_name');
                            }}
                            error={errors.full_name}
                            disabled={isLoading}
                        />

                        <Select
                            label="Assigned Role"
                            placeholder="Select a role"
                            required
                            data={[
                                { value: 'technician', label: 'TECHNICIAN' },
                                { value: 'cashier', label: 'CASHIER' }
                            ]}
                            value={formData.role}
                            onChange={(val) => setFormData({ ...formData, role: val || 'cashier' })}
                            disabled={isLoading}
                        />

                        <PasswordInput
                            label="Password"
                            placeholder="Min 6 chars"
                            required
                            value={formData.password}
                            onChange={(e) => {
                                setFormData({ ...formData, password: e.target.value });
                                clearError('password');
                            }}
                            error={errors.password}
                            disabled={isLoading}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            mt="xl"
                            size="lg"
                            className="block-button"
                            loading={isLoading}
                            leftSection={<UserPlus size={18} />}
                        >
                            CREATE ACCOUNT
                        </Button>
                    </Stack>
                </form>

                <Group justify="center" mt={30}>
                    <Anchor component={Link} to="/login" size="sm" fw={800} color="dark" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'underline' }}>
                        <ArrowLeft size={16} />
                        BACK TO LOGIN
                    </Anchor>
                </Group>
            </Card>
        </Container>
    );
}
