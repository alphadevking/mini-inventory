import React from 'react';
import { Button, Group, Text, Title, Stack, Box } from '@mantine/core';
import { ArrowLeft, RefreshCw } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showRefresh?: boolean;
  showBack?: boolean;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  onBack,
  onRefresh,
  isRefreshing = false,
  showRefresh = false,
  showBack = false,
  children,
}) => {
  return (
    <Stack gap="xs" mb="xl">
      <Group justify="space-between" align="flex-start">
        <Stack gap={6}>
          {showBack && (
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              leftSection={<ArrowLeft size={14} />}
              onClick={onBack}
              p={0}
              h="auto"
              mb={2}
              fw={500}
              style={{ color: 'var(--echo-text-2)' }}
            >
              Back
            </Button>
          )}
          <Title
            order={1}
            fw={800}
            style={{
              fontFamily: "'Manrope', sans-serif",
              letterSpacing: '-0.04em',
              fontSize: '2rem',
              color: 'var(--echo-text)',
            }}
          >
            {title}
          </Title>
          {description && (
            <Text size="sm" style={{ color: 'var(--echo-text-2)' }}>
              {description}
            </Text>
          )}
        </Stack>

        <Group align="center" gap="sm">
          {showRefresh && onRefresh && (
            <Button
              variant="light"
              color="gray"
              size="sm"
              leftSection={<RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />}
              onClick={onRefresh}
              loading={isRefreshing}
              style={{ color: 'var(--echo-text-2)' }}
            >
              Refresh
            </Button>
          )}
          {children}
        </Group>
      </Group>

      {/* Gradient accent line */}
      <Box
        style={{
          height: '2px',
          width: '48px',
          background: 'linear-gradient(90deg, var(--echo-amber), transparent)',
          borderRadius: 'var(--echo-radius-pill)',
          marginTop: 2,
        }}
      />
    </Stack>
  );
};
