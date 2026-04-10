import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button, Group, Text, Stack, Title, Box } from '@mantine/core';

interface ErrorDisplayProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    onBack?: () => void;
    showRetry?: boolean;
    showBack?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    title = "Something went wrong",
    message,
    onRetry,
    onBack,
    showRetry = true,
    showBack = false,
}) => {
    return (
        <Box
            style={{
                backgroundColor: 'var(--echo-surface)',
                border: '1px solid var(--echo-border)',
                borderRadius: 'var(--echo-radius-lg)',
                boxShadow: 'none',
                padding: '2.5rem',
                maxWidth: 480,
                margin: '0 auto',
            }}
        >
            <Stack align="center" gap="md" py="md">
                <Box
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 'var(--echo-radius-md)',
                        backgroundColor: 'rgba(var(--echo-danger-rgb), 0.10)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <AlertCircle size={28} color="var(--echo-danger)" />
                </Box>

                <Stack align="center" gap={6}>
                    <Title
                        order={3}
                        fw={700}
                        style={{
                            fontFamily: "'Manrope', sans-serif",
                            color: 'var(--echo-text)',
                            textAlign: 'center',
                        }}
                    >
                        {title}
                    </Title>
                    {message && (
                        <Text
                            size="sm"
                            style={{
                                color: 'var(--echo-text-2)',
                                textAlign: 'center',
                                maxWidth: 360,
                            }}
                        >
                            {message}
                        </Text>
                    )}
                </Stack>

                <Group mt="xs">
                    {showBack && (
                        <Button
                            variant="light"
                            color="gray"
                            onClick={onBack}
                            leftSection={<ArrowLeft size={15} />}
                        >
                            Go Back
                        </Button>
                    )}
                    {showRetry && onRetry && (
                        <Button
                            color="indigo"
                            onClick={onRetry}
                            leftSection={<RefreshCw size={15} />}
                        >
                            Try Again
                        </Button>
                    )}
                </Group>
            </Stack>
        </Box>
    );
};
