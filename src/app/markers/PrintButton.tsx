"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
    >
      Print cards
    </button>
  );
}
