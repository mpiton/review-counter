import type { ReactNode } from "react";

interface IconBtnProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly onClick: () => void;
  readonly spinning?: boolean;
}

export function IconBtn({ children, label, onClick, spinning = false }: IconBtnProps) {
  return (
    <button
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--fg)]"
      onClick={onClick}
      title={label}
      type="button"
    >
      <span className={spinning ? "inline-block animate-spin" : "inline-block"}>{children}</span>
    </button>
  );
}
