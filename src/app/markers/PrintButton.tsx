"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-brass-light px-4 py-2 text-sm font-medium text-vault transition-colors hover:bg-chalk"
    >
      Print cards
    </button>
  );
}
