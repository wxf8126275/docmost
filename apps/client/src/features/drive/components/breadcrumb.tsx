import { Anchor, Breadcrumbs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IDriveBreadcrumb } from "../types/drive.types";

interface DriveBreadcrumbProps {
  path: IDriveBreadcrumb[];
  onNavigate: (index: number) => void;
}

export default function DriveBreadcrumb({
  path,
  onNavigate,
}: DriveBreadcrumbProps) {
  const { t } = useTranslation();
  return (
    <Breadcrumbs separator="/">
      <Anchor
        onClick={() => onNavigate(-1)}
        style={{ cursor: "pointer" }}
        aria-label="breadcrumb-root"
      >
        {t("Root")}
      </Anchor>
      {path.map((crumb, index) => (
        <Anchor
          key={crumb.id}
          onClick={() => onNavigate(index)}
          style={{ cursor: "pointer" }}
          aria-label={`breadcrumb-${crumb.id}`}
        >
          {crumb.name}
        </Anchor>
      ))}
    </Breadcrumbs>
  );
}
