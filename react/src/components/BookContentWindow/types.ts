export interface Chapter {
  id: number | string;
  title: string;
  content: string;
  unit: number;
  enhancedContent?: string;
  layout?: any;
  isUnitIntro?: boolean;
  realChapter?: Chapter;
}

export interface Highlight {
  id: string;
  text: string;
  comment: string;
}

export interface Book {
  id: string;
  title: string;
  subject: string;
  color: string;
  chapters: Chapter[];
}
