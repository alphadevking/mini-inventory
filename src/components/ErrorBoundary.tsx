import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button, Group, Text, Box, Stack, Center, Paper, Title, Code, ScrollArea, Divider } from '@mantine/core';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Center style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }} p="md">
          <Paper withBorder p="xl" radius="md" maw={600} w="100%">
            <Stack align="center" gap="lg">
              <AlertCircle size={48} color="var(--mantine-color-red-6)" />

              <Box ta="center">
                <Title order={2} mb="xs">Something went wrong</Title>
                <Text color="dimmed" size="sm">
                  We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
                </Text>
              </Box>

              <Group justify="center">
                <Button
                  leftSection={<RefreshCw size={16} />}
                  onClick={this.handleReset}
                >
                  Try again
                </Button>
                <Button
                  variant="light"
                  color="gray"
                  onClick={() => window.location.reload()}
                >
                  Refresh page
                </Button>
              </Group>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box w="100%">
                  <Divider my="lg" label="Developer Details" labelPosition="center" />
                  <Stack gap="xs">
                    <Text size="sm" fw={700} c="red">
                      {this.state.error.name}: {this.state.error.message}
                    </Text>
                    <ScrollArea h={200} type="always" offsetScrollbars>
                      <Code block color="red.0" c="red.9" style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error.stack}
                        {this.state.errorInfo?.componentStack}
                      </Code>
                    </ScrollArea>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
        </Center>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
