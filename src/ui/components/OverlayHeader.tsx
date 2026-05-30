import type { PointerEvent } from "react";
import { IconBtn } from "./IconBtn";

interface OverlayHeaderProps {
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly onClose: () => void;
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onRefresh: () => void;
  readonly planetImageUrl: string;
}

export function OverlayHeader({
  isLoading,
  isRefreshing,
  onClose,
  onPointerDown,
  onRefresh,
  planetImageUrl,
}: OverlayHeaderProps) {
  return (
    <div
      className="flex h-11 cursor-grab items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-3 active:cursor-grabbing"
      onPointerDown={onPointerDown}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1a1b38]">
        <img alt="" className="h-5 w-5" draggable="false" src={planetImageUrl} />
      </span>
      <span className="text-[13px] font-semibold">Vates Reviews</span>
      <span className="ml-auto flex items-center gap-0.5" data-no-drag>
        <IconBtn label="Rafraîchir" onClick={onRefresh} spinning={isRefreshing || isLoading}>
          ⟳
        </IconBtn>
        <IconBtn label="Fermer (Esc)" onClick={onClose}>
          ✕
        </IconBtn>
      </span>
    </div>
  );
}
