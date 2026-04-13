import { useState } from 'react';
import {
  Title,
  Button,
  Table,
  Badge,
  Group,
  Stack,
  Modal,
  TextInput,
  Select,
  Text,
  ActionIcon,
  Tooltip,
  Box,
  Switch,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { UserPlus, Pencil, UserX } from 'lucide-react';
import { z } from 'zod';
import { useFetch, apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { User, UserRole } from '@/types/auth';
import { PageHeader } from '@/components/PageHeader';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'technician', 'cashier'] as const),
});

const EditUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').optional(),
  role: z.enum(['admin', 'manager', 'technician', 'cashier'] as const).optional(),
  is_active: z.boolean().optional(),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;
type EditUserInput = z.infer<typeof EditUserSchema>;

// ─── Role badge colours ───────────────────────────────────────────────────────

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'red',
  manager: 'blue',
  technician: 'green',
  cashier: 'yellow',
};

// ─── Role options filtered by actor ──────────────────────────────────────────

function allowedRoleOptions(actorRole: UserRole) {
  const all = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'technician', label: 'Technician' },
    { value: 'cashier', label: 'Cashier' },
  ];
  if (actorRole === 'admin') return all;
  return all.filter((r) => r.value === 'technician' || r.value === 'cashier');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: actor } = useAuth();
  const { data: users, loading, error, refetch } = useFetch<User[]>('/api/auth/users');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createForm = useForm<CreateUserInput>({
    validate: zodResolver(CreateUserSchema),
    initialValues: {
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'cashier',
    },
  });

  const editForm = useForm<EditUserInput>({
    validate: zodResolver(EditUserSchema),
    initialValues: { full_name: '', role: undefined, is_active: true },
  });

  // ── Create ──────────────────────────────────────────────────────────────────

  const handleCreate = createForm.onSubmit(async (values) => {
    setSubmitting(true);
    try {
      await apiRequest<User>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      notifications.show({ title: 'User created', message: `${values.username} has been added.`, color: 'green' });
      createForm.reset();
      setCreateOpen(false);
      refetch();
    } catch (e: unknown) {
      notifications.show({ title: 'Error', message: e instanceof Error ? e.message : 'Failed to create user', color: 'red' });
    } finally {
      setSubmitting(false);
    }
  });

  // ── Edit ────────────────────────────────────────────────────────────────────

  const openEdit = (target: User) => {
    setEditTarget(target);
    editForm.setValues({ full_name: target.full_name, role: target.role, is_active: target.is_active });
  };

  const handleEdit = editForm.onSubmit(async (values) => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await apiRequest<User>(`/api/auth/users/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      notifications.show({ title: 'User updated', message: `${editTarget.username} has been updated.`, color: 'green' });
      setEditTarget(null);
      refetch();
    } catch (e: unknown) {
      notifications.show({ title: 'Error', message: e instanceof Error ? e.message : 'Failed to update user', color: 'red' });
    } finally {
      setSubmitting(false);
    }
  });

  // ── Deactivate ──────────────────────────────────────────────────────────────

  const handleDeactivate = async (target: User) => {
    if (!window.confirm(`Deactivate ${target.username}? They will no longer be able to log in.`)) return;
    try {
      await apiRequest(`/api/auth/users/${target.id}`, { method: 'DELETE' });
      notifications.show({ title: 'User deactivated', message: `${target.username} has been deactivated.`, color: 'orange' });
      refetch();
    } catch (e: unknown) {
      notifications.show({ title: 'Error', message: e instanceof Error ? e.message : 'Failed to deactivate user', color: 'red' });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!actor) return null;

  return (
    <Stack gap="lg">
      <PageHeader title="Users" description="Manage staff accounts and role assignments.">
        <Button leftSection={<UserPlus size={16} />} onClick={() => setCreateOpen(true)}>
          Add User
        </Button>
      </PageHeader>

      {error && (
        <Text c="red" size="sm">Failed to load users: {error.message}</Text>
      )}

      <Box>
        <Table striped highlightOnHover withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Username</Table.Th>
              <Table.Th>Full Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed" py="md">Loading users…</Text>
                </Table.Td>
              </Table.Tr>
            )}
            {!loading && users?.map((u) => (
              <Table.Tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <Table.Td fw={700}>{u.username}</Table.Td>
                <Table.Td>{u.full_name}</Table.Td>
                <Table.Td c="dimmed">{u.email}</Table.Td>
                <Table.Td>
                  <Badge color={ROLE_COLORS[u.role]}>{u.role}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={u.is_active ? 'green' : 'gray'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Edit">
                      <ActionIcon variant="subtle" onClick={() => openEdit(u)}>
                        <Pencil size={16} />
                      </ActionIcon>
                    </Tooltip>
                    {actor.role === 'admin' && u.id !== actor.id && u.is_active && (
                      <Tooltip label="Deactivate">
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeactivate(u)}>
                          <UserX size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      {/* ── Create modal ──────────────────────────────────────────────────── */}
      <Modal
        opened={createOpen}
        onClose={() => { setCreateOpen(false); createForm.reset(); }}
        title="Add User"
        size="md"
      >
        <form onSubmit={handleCreate}>
          <Stack gap="sm">
            <TextInput label="Username" placeholder="jdoe" required {...createForm.getInputProps('username')} />
            <TextInput label="Full Name" placeholder="Jane Doe" required {...createForm.getInputProps('full_name')} />
            <TextInput label="Email" placeholder="jane@store.local" required {...createForm.getInputProps('email')} />
            <TextInput
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              required
              {...createForm.getInputProps('password')}
            />
            <Select
              label="Role"
              data={allowedRoleOptions(actor.role)}
              required
              {...createForm.getInputProps('role')}
            />
            <Button type="submit" loading={submitting} mt="xs">
              Create User
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      <Modal
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Edit ${editTarget.username}` : 'Edit User'}
        size="md"
      >
        <form onSubmit={handleEdit}>
          <Stack gap="sm">
            <TextInput label="Full Name" {...editForm.getInputProps('full_name')} />
            <Select
              label="Role"
              data={allowedRoleOptions(actor.role)}
              {...editForm.getInputProps('role')}
            />
            {actor.role === 'admin' && editTarget?.id !== actor.id && (
              <Switch
                label="Active"
                checked={editForm.values.is_active ?? true}
                onChange={(e) => editForm.setFieldValue('is_active', e.currentTarget.checked)}
              />
            )}
            <Button type="submit" loading={submitting} mt="xs">
              Save Changes
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
