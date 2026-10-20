import { Stack, Text, UnstyledButton } from "@mantine/core";
import {
  IconClock,
  IconFileText,
  IconLayoutGrid,
  IconMusic,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { DriveCategory } from "../types/drive.types";

const CATEGORIES: { value: DriveCategory; icon: typeof IconClock }[] = [
  { value: "recent", icon: IconClock },
  { value: "all", icon: IconLayoutGrid },
  { value: "images", icon: IconPhoto },
  { value: "documents", icon: IconFileText },
  { value: "videos", icon: IconVideo },
  { value: "music", icon: IconMusic },
];

interface DriveCategoryNavProps {
  value: DriveCategory;
  onChange: (category: DriveCategory) => void;
}

/**
 * Weiyun-style category navigation (recent / all / images / documents / videos /
 * music). Controlled component: the owner decides where the selection lives —
 * first the drive browser, then (drive-category-sidebar) the space sidebar —
 * so this component stays presentational and carries no state of its own.
 * Scroll/wrapping is the consumer's concern.
 */
export default function DriveCategoryNav({
  value,
  onChange,
}: DriveCategoryNavProps) {
  const { t } = useTranslation();

  return (
    <Stack gap={2}>
      {CATEGORIES.map(({ value: category, icon: CategoryIcon }) => (
        <UnstyledButton
          key={category}
          aria-label={`category-${category}`}
          data-active={value === category || undefined}
          onClick={() => onChange(category)}
          p="xs"
          style={(theme) => ({
            borderRadius: theme.radius.sm,
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor:
              value === category
                ? "var(--mantine-color-blue-light)"
                : undefined,
          })}
        >
          <CategoryIcon size={16} />
          <Text size="sm">
            {t(category.charAt(0).toUpperCase() + category.slice(1))}
          </Text>
        </UnstyledButton>
      ))}
    </Stack>
  );
}
