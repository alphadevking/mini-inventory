import React from 'react';
import { Loader, Text, Center, Stack } from '@mantine/core';

interface LoadingStateProps {
    message?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'bars' | 'oval' | 'dots';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    message = "Loading...",
    size = 'md',
    variant = 'dots',
}) => {
    return (
        <Center style={{ minHeight: '16rem' }}>
            <Stack align="center" gap="lg">
                <Loader size={size} type={variant} color="indigo" />
                <Text
                    size="sm"
                    fw={500}
                    style={{
                        color: 'var(--echo-text-3)',
                        letterSpacing: '0.02em',
                    }}
                >
                    {message}
                </Text>
            </Stack>
        </Center>
    );
};
