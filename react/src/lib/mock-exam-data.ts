export interface Question {
  id: number;
  question: string;
  type: 'MCQ' | 'SHORT' | 'LONG' | 'SPEECH'; // Added SPEECH type
  options?: string[];
  answer?: string | number; // For MCQ, this would be the index of the correct option
  requiresSpeech?: boolean; // New: indicates if question requires a spoken answer
  voiceAnswer?: string; // New: stores the transcribed spoken answer
}

export const mockExamQuestions: Question[] = [
  {
    id: 1,
    question: "What is the powerhouse of the cell?",
    type: 'MCQ',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Chloroplast'],
    answer: 2,
  },
  {
    id: 2,
    question: "Briefly explain the process of photosynthesis.",
    type: 'SPEECH', // Changed to SPEECH type
    answer: 'Photosynthesis is a process used by plants, algae, and certain bacteria to convert light energy into chemical energy.',
    requiresSpeech: true, // Added requiresSpeech
  },
  {
    id: 3,
    question: "Describe Newton's First Law of Motion and provide a real-world example.",
    type: 'LONG',
    answer: "Newton's First Law, the law of inertia, states that an object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force. A real-world example is a car coming to a sudden stop, and the passengers lurching forward."
  },
    {
    id: 4,
    question: "What is the value of 'pi' (to two decimal places)?",
    type: 'MCQ',
    options: ['3.12', '3.14', '3.16', '3.18'],
    answer: 1,
  },
  {
    id: 5,
    question: "Define 'supply and demand' in economics.",
    type: 'SHORT',
    answer: 'Supply and demand is a model for price determination in a market.'
  },
  {
    id: 6,
    question: "Elaborate on the causes and effects of the Industrial Revolution.",
    type: 'LONG',
    answer: 'The Industrial Revolution was caused by factors like the availability of resources, technological advancements, and a growing population. Its effects include urbanization, new social classes, and significant environmental changes.'
  }
];
