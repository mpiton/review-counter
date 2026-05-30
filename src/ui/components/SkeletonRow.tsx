export function SkeletonRow() {
  return (
    <div className="flex h-[34px] items-center gap-3 px-3">
      <span className="h-4 w-[3px] rounded-full bg-[var(--border)]" />
      <span className="h-3 w-[38%] animate-pulse rounded bg-[var(--surface)]" />
      <span className="h-2.5 w-[26%] animate-pulse rounded bg-[var(--surface)]" />
      <span className="ml-auto h-[22px] w-7 animate-pulse rounded-md bg-[var(--surface)]" />
    </div>
  );
}
