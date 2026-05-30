import { SectionLabel } from "./Section";
import { SkeletonRow } from "./SkeletonRow";

export function LoadingSections() {
  return (
    <div className="px-1.5">
      <SectionLabel label="FRONTEND" tone="frontend" />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SectionLabel label="BACKEND" tone="backend" />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}
