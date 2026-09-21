export type ElementType = 'text' | 'image' | 'rect' | 'ellipse' | 'line' | 'arrow';
export interface SlideElement {
  id: string; type: ElementType; x: number; y: number; width: number; height: number;
  rotation?: number; opacity?: number; text?: string; fontFamily?: string; fontSize?: number;
  bold?: boolean; italic?: boolean; underline?: boolean; align?: 'left' | 'center' | 'right' | 'justify';
  fill?: string; stroke?: string; strokeWidth?: number; cornerRadius?: number; lineHeight?: number;
  list?: 'none' | 'bullet' | 'number'; assetId?: string; groupId?: string | null;
  crop?: { x: number; y: number; width: number; height: number };
}
export interface Slide { id: string; title: string; background: string; notes: string; elements: SlideElement[] }
export interface SlideDocument { title: string; theme: Record<string, any>; slides: Slide[] }
export interface ChatMessage { id: string; role: string; text: string; slideId?: string; suggestions?: string[]; images?: { url: string; title?: string; source?: string }[] }
export interface Deck extends SlideDocument {
  deckId: string; deckRef: string; pythonSessionId: string; editUrl: string; embedUrl: string;
  revision: number; role: 'owner' | 'editor' | 'viewer'; sessionEnded: boolean;
  collaborators: { userId: string; email: string; role: string }[]; messages: ChatMessage[];
  proposal: null | { id: string; slideId: string; baseRevision: number; operations: any[]; feedback: string };
}
export const WIDTH = 1280, HEIGHT = 720;
export const uid = () => crypto.randomUUID();
export const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export const docOf = (deck: SlideDocument): SlideDocument => copy({ title: deck.title, theme: deck.theme, slides: deck.slides });
export const blankSlide = (): Slide => ({ id: uid(), title: 'Untitled slide', background: '#ffffff', notes: '', elements: [] });
export const newElement = (type: ElementType): SlideElement => ({
  id: uid(), type, x: 100, y: 100, width: type === 'text' ? 500 : 240, height: type === 'text' ? 120 : type === 'line' || type === 'arrow' ? 4 : 180,
  rotation: 0, opacity: 1, fill: type === 'text' ? '#17251f' : '#d3eee2', stroke: '#277f60', strokeWidth: type === 'text' ? 0 : 2,
  ...(type === 'text' ? { text: 'Add your text', fontSize: 32, fontFamily: 'Arial', lineHeight: 1.2, align: 'left' as const, list: 'none' as const } : {}),
});
export function placeElement(element: SlideElement, existing: SlideElement[]): SlideElement {
  for (let y = 70; y + element.height <= HEIGHT - 30; y += 60) {
    for (let x = 80; x + element.width <= WIDTH - 30; x += 80) {
      if (!existing.some(e => x < e.x + e.width + 12 && x + element.width + 12 > e.x && y < e.y + e.height + 12 && y + element.height + 12 > e.y)) return { ...element, x, y };
    }
  }
  return { ...element, x: (WIDTH - element.width) / 2, y: (HEIGHT - element.height) / 2 };
}
