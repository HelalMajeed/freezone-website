/**
 * Imperative confirmation modal: `await confirmDialog({...})` returns a Promise<boolean>.
 * A single <ConfirmDialogHost /> mounted near the app root renders the prompt.
 *
 * Designed to replace native `window.confirm(...)` calls without restructuring callers —
 * the awaiting code reads the same way and the dialog itself is RTL-aware + non-blocking.
 */

export type ConfirmOptions = {
  /** Optional bold title above the message. */
  title?: string;
  /** Required prompt body. */
  message: string;
  /** Override confirm button label (default: تأكيد). */
  confirmLabel?: string;
  /** Override cancel button label (default: إلغاء). */
  cancelLabel?: string;
  /** Render the confirm button in destructive style (red). */
  danger?: boolean;
};

type State =
  | { open: false }
  | { open: true; opts: ConfirmOptions; resolve: (answer: boolean) => void };

let state: State = { open: false };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getConfirmState(): State {
  return state;
}

export function subscribeConfirm(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  /** Resolve any previously open prompt as cancelled so stacked calls don't deadlock. */
  if (state.open) {
    const previous = state.resolve;
    state = { open: false };
    previous(false);
  }
  return new Promise<boolean>((resolve) => {
    state = { open: true, opts, resolve };
    emit();
  });
}

export function resolveConfirm(answer: boolean): void {
  if (!state.open) return;
  const r = state.resolve;
  state = { open: false };
  emit();
  r(answer);
}
