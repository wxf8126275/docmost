import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  PasswordInput,
  Select,
  Switch,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconDeviceFloppy,
  IconEdit,
  IconInfoCircle,
  IconPlus,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useHasFeature } from "@/ee/hooks/use-feature";
import { Feature } from "@/ee/features";
import { useUpgradeLabel } from "@/ee/hooks/use-upgrade-label";
import {
  createAiProvider,
  deleteAiProvider,
  listAiProviders,
  setDefaultAiProvider,
  updateAiProvider,
} from "@/ee/ai/services/ai-provider-service";
import {
  AiProvider,
  CreateAiProviderInput,
} from "@/ee/ai/types/ai-provider.types";

const DRIVER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "openai-compatible", label: "OpenAI-compatible" },
  { value: "gemini", label: "Gemini" },
  { value: "ollama", label: "Ollama" },
];

export default function ProviderSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasAccess = useHasFeature(Feature.AI_PROVIDERS);
  const upgradeLabel = useUpgradeLabel();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AiProvider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiProvider | null>(null);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["aiProviders"],
    queryFn: listAiProviders,
  });

  const form = useForm<CreateAiProviderInput>({
    initialValues: {
      name: "",
      driver: "openai",
      apiKey: "",
      baseUrl: "",
      completionModel: "",
      embeddingModel: "",
      isDefault: false,
    },
    validate: {
      name: (v) => (v && v.trim() ? null : t("Name is required")),
      completionModel: (v) =>
        v && v.trim() ? null : t("Completion model is required"),
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.reset();
  };

  const openCreate = () => {
    setEditing(null);
    form.setValues({
      name: "",
      driver: "openai",
      apiKey: "",
      baseUrl: "",
      completionModel: "",
      embeddingModel: "",
      isDefault: false,
    });
    setModalOpen(true);
  };

  const openEdit = (provider: AiProvider) => {
    setEditing(provider);
    form.setValues({
      name: provider.name,
      driver: provider.driver,
      apiKey: "",
      baseUrl: provider.baseUrl ?? "",
      completionModel: provider.completionModel,
      embeddingModel: provider.embeddingModel ?? "",
      isDefault: provider.isDefault,
    });
    setModalOpen(true);
  };

  const handleSubmit = form.onSubmit((values) => {
    const payload: CreateAiProviderInput = {
      ...values,
      apiKey: values.apiKey || undefined,
      baseUrl: values.baseUrl || undefined,
      embeddingModel: values.embeddingModel || undefined,
    };
    if (editing) {
      updateAiProviderMutate.mutate({ ...payload, id: editing.id });
    } else {
      createAiProviderMutate.mutate(payload);
    }
  });

  const createAiProviderMutate = useMutation({
    mutationFn: (input: CreateAiProviderInput) => createAiProvider(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiProviders"] });
      notifications.show({ message: t("Provider saved"), color: "green" });
      closeModal();
    },
    onError: (err: any) =>
      notifications.show({
        message: err?.response?.data?.message ?? t("Failed to save provider"),
        color: "red",
      }),
  });

  const updateAiProviderMutate = useMutation({
    mutationFn: (input: CreateAiProviderInput & { id: string }) =>
      updateAiProvider(input.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiProviders"] });
      notifications.show({ message: t("Provider updated"), color: "green" });
      closeModal();
    },
    onError: (err: any) =>
      notifications.show({
        message: err?.response?.data?.message ?? t("Failed to update provider"),
        color: "red",
      }),
  });

  const deleteAiProviderMutate = useMutation({
    mutationFn: (id: string) => deleteAiProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiProviders"] });
      notifications.show({ message: t("Provider deleted"), color: "green" });
      setDeleteTarget(null);
    },
    onError: (err: any) =>
      notifications.show({
        message: err?.response?.data?.message ?? t("Failed to delete provider"),
        color: "red",
      }),
  });

  const setDefaultMutate = useMutation({
    mutationFn: (id: string) => setDefaultAiProvider(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["aiProviders"] }),
    onError: (err: any) =>
      notifications.show({
        message: err?.response?.data?.message ?? t("Failed to set default"),
        color: "red",
      }),
  });

  if (!hasAccess) {
    return (
      <Stack gap="lg">
        <Group justify="space-between" wrap="nowrap" gap="xl">
          <Text size="md">{t("AI providers")}</Text>
        </Group>
        <Alert icon={<IconInfoCircle />} title={upgradeLabel} color="blue">
          {t(
            "AI providers are only available in the Docmost enterprise edition. Contact sales@docmost.com.",
          )}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="nowrap" gap="xl">
        <div>
          <Text size="md">{t("AI providers")}</Text>
          <Text size="sm" c="dimmed">
            {t(
              "Manage the AI service providers used by this workspace. The default provider overrides the server environment variables.",
            )}
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openCreate}
          disabled={!hasAccess}
        >
          {t("Add provider")}
        </Button>
      </Group>

      {isLoading ? (
        <Text size="sm" c="dimmed">
          {t("Loading...")}
        </Text>
      ) : providers.length === 0 ? (
        <Paper withBorder p="md" radius="sm">
          <Text size="sm" c="dimmed">
            {t("No AI providers configured yet.")}
          </Text>
        </Paper>
      ) : (
        <Table withRowBorders={false} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("Name")}</Table.Th>
              <Table.Th>{t("Driver")}</Table.Th>
              <Table.Th>{t("Completion model")}</Table.Th>
              <Table.Th>{t("Default")}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {providers.map((provider) => (
              <Table.Tr key={provider.id}>
                <Table.Td>{provider.name}</Table.Td>
                <Table.Td>{provider.driver}</Table.Td>
                <Table.Td>{provider.completionModel}</Table.Td>
                <Table.Td>
                  {provider.isDefault ? (
                    <Badge variant="light" color="teal">
                      {t("Default")}
                    </Badge>
                  ) : (
                    <Tooltip label={t("Set as default")}>
                      <ActionIcon
                        variant="subtle"
                        onClick={() => setDefaultMutate.mutate(provider.id)}
                        aria-label={t("Set as default")}
                      >
                        <IconStar size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon
                      variant="subtle"
                      onClick={() => openEdit(provider)}
                      aria-label={t("Edit provider")}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setDeleteTarget(provider)}
                      aria-label={t("Delete provider")}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={editing ? t("Edit provider") : t("Add provider")}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label={t("Name")}
              required
              {...form.getInputProps("name")}
            />
            <Select
              label={t("Driver")}
              data={DRIVER_OPTIONS}
              required
              {...form.getInputProps("driver")}
            />
            <PasswordInput
              label={t("API key")}
              placeholder={
                editing ? t("Leave blank to keep existing key") : ""
              }
              {...form.getInputProps("apiKey")}
            />
            <TextInput
              label={t("Base URL")}
              placeholder="https://api.openai.com/v1"
              {...form.getInputProps("baseUrl")}
            />
            <TextInput
              label={t("Completion model")}
              required
              {...form.getInputProps("completionModel")}
            />
            <TextInput
              label={t("Embedding model")}
              {...form.getInputProps("embeddingModel")}
            />
            <Switch
              label={t("Set as default provider")}
              {...form.getInputProps("isDefault", { type: "checkbox" })}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeModal}>
                {t("Cancel")}
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={16} />}
                loading={
                  createAiProviderMutate.isPending ||
                  updateAiProviderMutate.isPending
                }
              >
                {t("Save")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("Delete provider")}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {t("Delete the provider")} <b>{deleteTarget?.name}</b>?{" "}
            {t("This action cannot be undone.")}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              {t("Cancel")}
            </Button>
            <Button
              color="red"
              loading={deleteAiProviderMutate.isPending}
              onClick={() =>
                deleteTarget && deleteAiProviderMutate.mutate(deleteTarget.id)
              }
            >
              {t("Delete")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
