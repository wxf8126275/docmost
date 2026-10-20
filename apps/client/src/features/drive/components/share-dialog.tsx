import { useState } from "react";
import {
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useCreateShareMutation } from "../queries/drive-query";
import { IDriveShare } from "../types/drive.types";

interface ShareDialogProps {
  fileId: string;
  spaceId: string;
  opened: boolean;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "Never", value: "" },
  { label: "1 hour", value: "1h" },
  { label: "1 day", value: "1d" },
  { label: "7 days", value: "7d" },
];

const EXPIRY_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

/**
 * Generates a public share link for a drive file. The server owns the token and
 * the permission/expiry, so we only forward the user's choices and render the
 * returned link. Links resolve at `/api/drive/shares/:token` (read-only / or
 * download depending on `permission`).
 */
export default function ShareDialog({
  fileId,
  spaceId,
  opened,
  onClose,
}: ShareDialogProps) {
  const { t } = useTranslation();
  const createShareMut = useCreateShareMutation();
  const [permission, setPermission] = useState<"read" | "download">("read");
  const [expiry, setExpiry] = useState<string>("");
  const [share, setShare] = useState<IDriveShare | null>(null);

  async function handleGenerate() {
    const expiresAt =
      expiry && EXPIRY_MS[expiry]
        ? new Date(Date.now() + EXPIRY_MS[expiry]).toISOString()
        : null;

    const created = await createShareMut.mutateAsync({
      fileId,
      spaceId,
      input: { permission, expiresAt },
    });
    setShare(created);
  }

  function handleCopy() {
    if (share) {
      void navigator.clipboard?.writeText(shareLink(share.token));
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={t("Share")}>
      <Stack>
        <Stack gap={4}>
          <Text size="sm">{t("Permission")}</Text>
          <SegmentedControl
            fullWidth
            value={permission}
            onChange={(value) => setPermission(value as "read" | "download")}
            data={[
              { label: t("Read"), value: "read" },
              { label: t("Download"), value: "download" },
            ]}
          />
        </Stack>

        <Stack gap={4}>
          <Text size="sm">{t("Expires")}</Text>
          <SegmentedControl
            fullWidth
            value={expiry}
            onChange={(value) => setExpiry(value as string)}
            data={EXPIRY_OPTIONS.map((o) => ({
              label: t(o.label),
              value: o.value,
            }))}
          />
        </Stack>

        {!share && (
          <Button
            aria-label="generate-link"
            onClick={() => void handleGenerate()}
            loading={createShareMut.isPending}
          >
            {t("Generate link")}
          </Button>
        )}

        {share && (
          <Stack gap={4}>
            <TextInput
              readOnly
              aria-label="share-link"
              value={shareLink(share.token)}
            />
            <Group justify="flex-end">
              <Button
                aria-label="copy-link"
                leftSection={<IconCopy size={16} />}
                variant="light"
                onClick={handleCopy}
              >
                {t("Copy")}
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}

function shareLink(token: string): string {
  return `${window.location.origin}/api/drive/shares/${token}`;
}
