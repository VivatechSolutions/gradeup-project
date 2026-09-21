import { create } from 'zustand';
import { Deck, SlideDocument, copy, docOf } from './types';
interface State {
  deck: Deck | null; document: SlideDocument | null; selectedSlide: string; selected: string[];
  past: SlideDocument[]; future: SlideDocument[]; generation: number; savedGeneration: number;
  initialize: (deck: Deck) => void; change: (fn: (doc: SlideDocument) => void) => void;
  undo: () => void; redo: () => void; acknowledge: (deck: Deck, generation: number) => void;
}
export const useEditor = create<State>((set, get) => ({
  deck: null, document: null, selectedSlide: '', selected: [], past: [], future: [], generation: 0, savedGeneration: 0,
  initialize: deck => set(s => ({ deck, document: docOf(deck), selectedSlide: deck.slides.some(v => v.id === s.selectedSlide) ? s.selectedSlide : deck.slides[0]?.id, selected: [], past: [], future: [], generation: 0, savedGeneration: 0 })),
  change: fn => {
    const s = get(); if (!s.document || s.deck?.role === 'viewer') return;
    const next = copy(s.document); fn(next);
    if (JSON.stringify(next) === JSON.stringify(s.document)) return;
    set({ document: next, past: [...s.past.slice(-39), s.document], future: [], generation: s.generation + 1 });
  },
  undo: () => { const s = get(); if (!s.past.length || !s.document || s.deck?.role === 'viewer') return; set({ document: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.document, ...s.future], generation: s.generation + 1, selected: [] }); },
  redo: () => { const s = get(); if (!s.future.length || !s.document || s.deck?.role === 'viewer') return; set({ document: s.future[0], future: s.future.slice(1), past: [...s.past, s.document], generation: s.generation + 1, selected: [] }); },
  acknowledge: (deck, generation) => set({ deck, savedGeneration: generation }),
}));
