export interface Chapter {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'not-started';
}

export interface Module {
  id:string;
  title: string;
  chapters: Chapter[];
  dueDate: string;
}

export const mockCurriculum: Module[] = [
  {
    id: 'module-1',
    title: 'Module 1: Algebra Basics',
    dueDate: '2026-09-30',
    chapters: [
      { id: 'chap-1-1', title: 'Introduction to Variables', status: 'completed' },
      { id: 'chap-1-2', title: 'Solving Linear Equations', status: 'in-progress' },
      { id: 'chap-1-3', title: 'Graphing Linear Equations', status: 'not-started' },
    ],
  },
  {
    id: 'module-2',
    title: 'Module 2: Geometry',
    dueDate: '2026-10-31',
    chapters: [
      { id: 'chap-2-1', title: 'Properties of Triangles', status: 'not-started' },
      { id: 'chap-2-2', title: 'Circles and Circumference', status: 'not-started' },
    ],
  },
  {
    id: 'module-3',
    title: 'Module 3: Trigonometry',
    dueDate: '2026-11-30',
    chapters: [
      { id: 'chap-3-1', title: 'Sine, Cosine, Tangent', status: 'not-started' },
      { id: 'chap-3-2', title: 'Unit Circle', status: 'not-started' },
      { id: 'chap-3-3', title: 'Trigonometric Identities', status: 'not-started' },
    ],
  },
];
