import React from 'react';
import { Card, Text, Group, Badge, Box, Progress, Stack } from '@mantine/core';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: LucideIcon;
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
    progress?: number;
    description?: string;
}

const colorMap: Record<string, { bg: string; fg: string; track: string }> = {
    blue:   { bg: 'rgba(37, 99, 235, 0.10)',  fg: 'var(--echo-info)',    track: 'blue' },
    teal:   { bg: 'rgba(5, 150, 105, 0.10)',  fg: 'var(--echo-success)', track: 'teal' },
    orange: { bg: 'rgba(217, 119, 6, 0.10)',  fg: 'var(--echo-warning)', track: 'orange' },
    red:    { bg: 'rgba(220, 38, 38, 0.10)',  fg: 'var(--echo-danger)',  track: 'red' },
    indigo: { bg: 'rgba(67, 56, 202, 0.10)',   fg: 'var(--echo-primary)', track: 'indigo' },
    violet: { bg: 'rgba(99, 102, 241, 0.10)',  fg: 'var(--echo-primary)', track: 'indigo' },
    green:  { bg: 'rgba(5, 150, 105, 0.10)',  fg: 'var(--echo-success)', track: 'teal' },
    dark:   { bg: 'var(--echo-surface-2)',     fg: 'var(--echo-text-2)',  track: 'gray' },
};

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    change,
    changeLabel,
    icon: Icon,
    color = 'blue',
    trend = 'neutral',
    progress,
    description,
}) => {
    const palette = colorMap[color] ?? colorMap['blue'];

    const trendColor = trend === 'up' ? 'teal' : trend === 'down' ? 'red' : 'gray';
    const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

    return (
        <Card className="block-card" padding="lg">
            <Group justify="space-between" mb="sm" align="flex-start">
                <Text
                    size="xs"
                    fw={600}
                    style={{
                        color: 'var(--echo-text-3)',
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                    }}
                >
                    {title}
                </Text>
                {Icon && (
                    <Box
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--echo-radius-sm)',
                            backgroundColor: palette.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Icon size={18} color={palette.fg} />
                    </Box>
                )}
            </Group>

            <Stack gap={4}>
                <Text
                    fw={800}
                    style={{
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: '1.75rem',
                        letterSpacing: '-0.04em',
                        lineHeight: 1.05,
                        color: 'var(--echo-text)',
                    }}
                >
                    {value}
                </Text>
                {description && (
                    <Text size="xs" style={{ color: 'var(--echo-text-3)' }}>
                        {description}
                    </Text>
                )}
            </Stack>

            {progress !== undefined && (
                <Progress
                    value={progress}
                    color={palette.track}
                    size="sm"
                    mt="md"
                />
            )}

            {change !== undefined && (
                <Group mt="md">
                    <Badge
                        color={trendColor}
                        variant="light"
                        leftSection={<TrendIcon size={12} />}
                        size="sm"
                    >
                        {Math.abs(change)}%{' '}
                        {changeLabel || (trend === 'up' ? 'up' : trend === 'down' ? 'down' : '')}
                    </Badge>
                </Group>
            )}
        </Card>
    );
};
