import {
  Table,
  Text,
  Group,
  ActionIcon,
  Box,
  Space,
  Menu,
  Anchor,
  SegmentedControl,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconDots,
  IconSettings,
  IconEye,
  IconEyeOff,
  IconCloud,
} from "@tabler/icons-react";
import StarButton from "@/features/favorite/components/star-button";
import {
  useWatchedSpaceIds,
  useWatchSpaceMutation,
  useUnwatchSpaceMutation,
} from "@/features/space/queries/space-watcher-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { formatMemberCount } from "@/lib";
import { getSpaceUrl } from "@/lib/config";
import { prefetchSpace } from "@/features/space/queries/space-query";
import { SearchInput } from "@/components/common/search-input";
import Paginate from "@/components/common/paginate";
import NoTableResults from "@/components/common/no-table-results";
import SpaceSettingsModal from "@/features/space/components/settings-modal";
import classes from "./all-spaces-list.module.css";
import rowClasses from "@/components/ui/clickable-table-row.module.css";
import clsx from "clsx";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import { AvatarIconType } from "@/features/attachments/types/attachment.types.ts";
import { AutoTooltipText } from "@/components/ui/auto-tooltip-text.tsx";

function WatchButton({ spaceId, watchedIds, size = 16 }: { spaceId: string; watchedIds: Set<string>; size?: number }) {
  const { t } = useTranslation();
  const watchMutation = useWatchSpaceMutation();
  const unwatchMutation = useUnwatchSpaceMutation();
  const isWatching = watchedIds.has(spaceId);
  const isPending = watchMutation.isPending || unwatchMutation.isPending;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isWatching) {
      unwatchMutation.mutate(spaceId);
    } else {
      watchMutation.mutate(spaceId);
    }
  };

  const label = isWatching ? t("Stop watching space") : t("Watch space");

  return (
    <Tooltip label={label} openDelay={250} withArrow>
      <ActionIcon
        variant="subtle"
        color={isWatching ? "blue" : "gray"}
        aria-label={label}
        aria-pressed={isWatching}
        onClick={handleToggle}
        loading={isPending}
      >
        {isWatching ? (
          <IconEyeOff size={size} stroke={2} />
        ) : (
          <IconEye size={size} stroke={2} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}

interface AllSpacesListProps {
  spaces: any[];
  onSearch: (query: string) => void;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
  onNext: () => void;
  onPrev: () => void;
}

export default function AllSpacesList({
  spaces,
  onSearch,
  hasPrevPage,
  hasNextPage,
  onNext,
  onPrev,
}: AllSpacesListProps) {
  const { t } = useTranslation();
  const watchedIds = useWatchedSpaceIds();
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "page" | "drive">("all");

  const visibleSpaces = spaces.filter(
    (space) => typeFilter === "all" || (space.type ?? "page") === typeFilter,
  );

  const handleOpenSettings = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    openSettings();
  };

  return (
    <Box>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <SearchInput onSearch={onSearch} />
        <SegmentedControl
          size="xs"
          aria-label="space-type-filter"
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as "all" | "page" | "drive")}
          data={[
            { label: t("All"), value: "all" },
            { label: t("Page"), value: "page" },
            { label: t("Drive"), value: "drive" },
          ]}
        />
      </Group>

      <Space h="md" />

      <Table.ScrollContainer minWidth={500}>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Caption>
            <VisuallyHidden>
              {t("List of spaces in this workspace")}
            </VisuallyHidden>
          </Table.Caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("Space")}</Table.Th>
              <Table.Th>{t("Members")}</Table.Th>
              <Table.Th w={130}>
                <VisuallyHidden>{t("Action")}</VisuallyHidden>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {visibleSpaces.length > 0 ? (
              visibleSpaces.map((space) => (
                <Table.Tr key={space.id} className={rowClasses.row}>
                  <Table.Td>
                    <Anchor
                      size="sm"
                      underline="never"
                      style={{
                        cursor: "pointer",
                        color: "var(--mantine-color-text)",
                      }}
                      className={clsx(classes.spaceLink, rowClasses.link)}
                      component={Link}
                      to={getSpaceUrl(space.slug)}
                    >
                      <Group
                        gap="sm"
                        wrap="nowrap"
                        onMouseEnter={() => prefetchSpace(space.slug, space.id)}
                      >
                        <CustomAvatar
                          name={space.name}
                          avatarUrl={space.logo}
                          type={AvatarIconType.SPACE_ICON}
                          color="initials"
                          variant="filled"
                          size="md"
                        />
                        {(space.type ?? "page") === "drive" && (
                          <Tooltip label={t("Drive")} withArrow>
                            <IconCloud
                              size={14}
                              aria-label="space-type-drive"
                              style={{
                                color: "var(--mantine-color-blue-6)",
                                flexShrink: 0,
                              }}
                            />
                          </Tooltip>
                        )}
                        <div style={{ minWidth: 0, overflow: "hidden", maxWidth: 350 }}>
                          <AutoTooltipText fz="sm" fw={500} lineClamp={1}>
                            {space.name}
                          </AutoTooltipText>
                          {space.description && (
                            <Text fz="xs" c="dimmed" lineClamp={2}>
                              {space.description}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                      {formatMemberCount(space.memberCount, t)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <StarButton type="space" spaceId={space.id} name={space.name} size={16} />
                      <WatchButton spaceId={space.id} watchedIds={watchedIds} size={16} />
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={t("Space menu")}
                          >
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconSettings size={16} />}
                            onClick={() => handleOpenSettings(space.id)}
                          >
                            {t("Space settings")}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <NoTableResults colSpan={3} />
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {visibleSpaces.length > 0 && (
        <Paginate
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          onNext={onNext}
          onPrev={onPrev}
        />
      )}

      {selectedSpaceId && (
        <SpaceSettingsModal
          spaceId={selectedSpaceId}
          opened={settingsOpened}
          onClose={closeSettings}
        />
      )}
    </Box>
  );
}
