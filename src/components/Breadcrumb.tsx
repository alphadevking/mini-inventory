import React from 'react';
import { Breadcrumbs, Anchor, Text } from '@mantine/core';
import { Home, ChevronRight } from 'lucide-react';
import { Link } from "react-router";

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const breadcrumbs = items.map((item, index) => {
    const isLast = index === items.length - 1;

    return isLast ? (
      <Text
        key={item.path}
        size="xs"
        fw={600}
        style={{ color: 'var(--echo-text-2)', letterSpacing: '0.01em' }}
      >
        {item.label}
      </Text>
    ) : (
      <Anchor
        component={Link}
        to={item.path}
        key={item.path}
        size="xs"
        fw={500}
        style={{
          color: 'var(--echo-text-3)',
          textDecoration: 'none',
          transition: 'color 150ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--echo-accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--echo-text-3)')}
      >
        {item.label}
      </Anchor>
    );
  });

  return (
    <Breadcrumbs
      separator={<ChevronRight size={12} style={{ color: 'var(--echo-border-strong)' }} />}
      mb="md"
      style={{
        paddingBottom: '10px',
        borderBottom: '1px solid var(--echo-border)',
      }}
    >
      <Anchor
        component={Link}
        to="/"
        size="xs"
        fw={500}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: 'var(--echo-text-3)',
          textDecoration: 'none',
          transition: 'color 150ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--echo-accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--echo-text-3)')}
      >
        <Home size={13} />
        Home
      </Anchor>
      {breadcrumbs}
    </Breadcrumbs>
  );
};
