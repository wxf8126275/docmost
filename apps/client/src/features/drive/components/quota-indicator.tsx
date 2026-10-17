import { Group, Progress, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/lib";

interface QuotaIndicatorProps {
  usedBytes: number;
  quota: number | null;
}

/**
 * Compact storage usage bar. When no quota is configured the drive is
 * effectively unlimited, so we render that explicitly instead of a bar.
 */
export default function QuotaIndicator({
  usedBytes,
  quota,
}: QuotaIndicatorProps) {
  const { t } = useTranslation();

  if (quota == null) {
    return (
      <Group gap={6}>
        <Text size="xs" c="dimmed">
          {t("Storage")}:
        </Text>
        <Text size="xs">{t("Unlimited")}</Text>
      </Group>
    );
  }

  const percent = Math.min(100, quota > 0 ? (usedBytes / quota) * 100 : 0);
  const color = percent >= 90 ? "red" : percent >= 75 ? "yellow" : "teal";

  return (
    <Group gap={8}>
      <Text size="xs" c="dimmed">
        {t("Storage")}:
      </Text>
      <Progress
        value={percent}
        color={color}
        w={120}
        aria-label="quota-progress"
      />
      <Text size="xs">
        {formatBytes(usedBytes)} / {formatBytes(quota)}
      </Text>
    </Group>
  );
}
