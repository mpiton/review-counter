const planetLogoUrl = "https://vates.tech/blog/content/images/2022/12/png-vates-planetonly.png";

export function PopupHeader() {
  return (
    <header className="flex h-11 items-center gap-2 border-b border-[var(--border)] px-4">
      <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-[#1a1b38]">
        <img
          alt=""
          className="pointer-events-none h-5 w-5"
          draggable={false}
          height="20"
          src={planetLogoUrl}
          width="20"
        />
      </span>
      <h1 className="text-[13px] font-semibold">Vates Review Counter</h1>
      <button
        aria-label="Fermer"
        className="ml-auto grid h-7 w-7 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]"
        onClick={() => window.close()}
        type="button"
      >
        ✕
      </button>
    </header>
  );
}
