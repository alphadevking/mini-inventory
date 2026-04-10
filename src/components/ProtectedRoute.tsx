import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from './LoadingState';
import { Title, Text, Button, Paper, Stack, Container, Center, Box } from '@mantine/core';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles = ['admin', 'manager', 'technician', 'cashier']
}) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <Center style={{ height: '100vh' }}>
                <LoadingState message="Checking authentication..." />
            </Center>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return (
            <Container size="sm" py={120}>
                <Paper withBorder p="xl" radius="md">
                    <Stack align="center" gap="lg" ta="center">
                        <Center w={60} h={60} bg="red.0" style={{ borderRadius: '100%' }}>
                            <ShieldAlert size={32} color="var(--mantine-color-red-6)" />
                        </Center>

                        <Box>
                            <Title order={2} mb="xs">Access Denied</Title>
                            <Text c="dimmed">
                                You do not have the necessary permissions to access this area.
                                Please contact your administrator if you believe this is an error.
                            </Text>
                        </Box>

                        <Button
                            variant="light"
                            color="gray"
                            leftSection={<ArrowLeft size={16} />}
                            onClick={() => window.history.back()}
                        >
                            Go Back
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    return <>{children}</>;
};
