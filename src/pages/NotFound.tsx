import { Title, Text, Button, Container, Group, Stack } from '@mantine/core';
import { Link } from "react-router";
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <Container py={80}>
      <Stack align="center" gap="xl">
        <Text
          size="120px"
          fw={900}
          c="black"
          style={{ lineHeight: 1, fontFamily: "'Manrope', sans-serif" }}
        >
          404
        </Text>

        <Title order={1} ta="center" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>You have found a secret place.</Title>

        <Text c="dimmed" size="lg" ta="center" maw={500} fw={500}>
          Unfortunately, this is only a 404 page. You may have mistyped the address, or the page has been moved to another url.
        </Text>

        <Group justify="center">
          <Button
            component={Link}
            to="/"
            size="md"
            variant="outline"
            color="dark"
            leftSection={<Home size={18} />}
            className="block-button"
          >
            Take Me Back Home
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
