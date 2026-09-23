const BUTTON_BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent text-white hover:bg-accent-strong dark:text-neutral-950`;
export const BUTTON_SECONDARY = `${BUTTON_BASE} border border-line bg-surface text-ink hover:bg-surface-2`;
export const BUTTON_QUIET = `${BUTTON_BASE} text-ink-2 hover:bg-surface-2 hover:text-ink`;

export const CARD = 'rounded-2xl border border-line bg-surface shadow-sm';
export const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.14em] text-ink-3';
