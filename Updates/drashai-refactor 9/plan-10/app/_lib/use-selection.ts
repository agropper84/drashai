'use client';
// Watches window selection. When 3+ chars are selected inside an element with
// data-selectable="true" (or its descendant), returns the selected text and
// an anchor rect for positioning the menu.

import { useEffect, useState } from 'react';

export interface SelectionState {
  text: string;
  rect: { top: number; left: number; bottom: number; right: number; width: number; height: number } | null;
  range: Range | null;
}

const MIN_CHARS = 3;

function isInsideSelectable(node: Node | null): boolean {
  let n: Node | null = node;
  while (n) {
    if (n.nodeType === 1) {
      const el = n as HTMLElement;
      if (el.dataset && el.dataset.selectable === 'true') return true;
      if (el.dataset && el.dataset.selectable === 'false') return false;
    }
    n = n.parentNode;
  }
  return false;
}

export function useSelection(): SelectionState {
  const [state, setState] = useState<SelectionState>({ text: '', rect: null, range: null });

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setState({ text: '', rect: null, range: null });
        return;
      }
      const text = sel.toString();
      if (text.length < MIN_CHARS) {
        setState({ text: '', rect: null, range: null });
        return;
      }
      const range = sel.getRangeAt(0);
      if (!isInsideSelectable(range.commonAncestorContainer)) {
        setState({ text: '', rect: null, range: null });
        return;
      }
      const rect = range.getBoundingClientRect();
      setState({
        text,
        range,
        rect: {
          top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right,
          width: rect.width, height: rect.height,
        },
      });
    };

    document.addEventListener('selectionchange', handler);
    document.addEventListener('mouseup', handler);
    document.addEventListener('keyup', handler);
    return () => {
      document.removeEventListener('selectionchange', handler);
      document.removeEventListener('mouseup', handler);
      document.removeEventListener('keyup', handler);
    };
  }, []);

  return state;
}
