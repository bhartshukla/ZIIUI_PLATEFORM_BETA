/* Shared mutable state for the library page (one object so modules stay decoupled). */
import { EFFECTS } from '../../effects/registry.js';

export const store = {
  /** Currently selected effect. */
  cur: EFFECTS[0],
  /** Generated code for the current effect (the untouched original). */
  html: '',
  /** AI-edited code for the current effect (equals `html` when not edited). */
  edited: '',
  /** True when `edited` differs from the original. */
  editActive: false,
  /** Persisted AI state for the current effect. */
  compState: null,
  /** True once the user typed into the text field (stops default-text reset). */
  dirty: false
};

/** The code currently shown in the preview. */
export const activeCode = () => (store.editActive ? store.edited : store.html);

/**
 * Extension points so the viewer does not import the AI panel directly
 * (avoids a circular dependency). The AI panel assigns these in init.
 */
export const hooks = {
  afterBuild() {},
  afterSelect() {}
};
