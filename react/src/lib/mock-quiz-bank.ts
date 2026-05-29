export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  subject: string;
  unit: string;
  type: 'exam' | 'competitive';
  examCategory?: 'NEET' | 'TNPSC' | 'UPSC' | 'Banking';
}

export const mockQuizQuestions: QuizQuestion[] = [
  // Exam Questions
  {
    id: 'exam-1',
    question: 'What is the powerhouse of the cell?',
    options: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Chloroplast'],
    correctAnswer: 2,
    subject: 'Biology',
    unit: 'Cell Structure',
    type: 'exam',
  },
  {
    id: 'exam-2',
    question: 'What is the value of x in the equation 2x + 5 = 15?',
    options: ['x = 2', 'x = 5', 'x = 7.5', 'x = 10'],
    correctAnswer: 1,
    subject: 'Mathematics',
    unit: 'Algebra',
    type: 'exam',
  },
  {
    id: 'exam-3',
    question: "What is Newton's first law of motion?",
    options: [
      'For every action, there is an equal and opposite reaction.',
      'The acceleration of an object is directly proportional to the net force.',
      'An object at rest stays at rest and an object in motion stays in motion.',
      'The force of gravity between two objects.',
    ],
    correctAnswer: 2,
    subject: 'Physics',
    unit: 'Classical Mechanics',
    type: 'exam',
  },

  // Competitive Exam Questions
  {
    id: 'comp-1',
    question: 'Which of the following is a vector quantity?',
    options: ['Speed', 'Distance', 'Mass', 'Velocity'],
    correctAnswer: 3,
    subject: 'Physics',
    unit: 'Motion in a Straight Line',
    type: 'competitive',
    examCategory: 'NEET',
  },
  {
    id: 'comp-2',
    question: 'The term "Dravida Nadu" was first proposed by which party?',
    options: ['Justice Party', 'Dravidar Kazhagam', 'DMK', 'Self-Respect Movement'],
    correctAnswer: 0,
    subject: 'History',
    unit: 'Modern Indian History',
    type: 'competitive',
    examCategory: 'TNPSC',
  },
  {
    id: 'comp-3',
    question: 'Who is known as the "Father of the Indian Constitution"?',
    options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Dr. B.R. Ambedkar', 'Sardar Vallabhbhai Patel'],
    correctAnswer: 2,
    subject: 'Political Science',
    unit: 'Indian Polity',
    type: 'competitive',
    examCategory: 'UPSC',
  },
  {
    id: 'comp-4',
    question: 'What is the currency of Japan?',
    options: ['Yuan', 'Yen', 'Won', 'Ringgit'],
    correctAnswer: 1,
    subject: 'General Knowledge',
    unit: 'World Currencies',
    type: 'competitive',
    examCategory: 'Banking',
  },
  {
    id: 'exam-4',
    question: 'Which is the largest gland in the human body?',
    options: ['Thyroid', 'Liver', 'Pancreas', 'Salivary gland'],
    correctAnswer: 1,
    subject: 'Biology',
    unit: 'Human Physiology',
    type: 'exam',
  },
  {
    id: 'exam-5',
    question: 'What is the formula for the area of a circle?',
    options: ['pi * r', '2 * pi * r', 'pi * r^2', '2 * r'],
    correctAnswer: 2,
    subject: 'Mathematics',
    unit: 'Geometry',
    type: 'exam',
  },
    {
    id: 'comp-5',
    question: 'Which of the following is not a function of the Reserve Bank of India?',
    options: ['Banker to the Government', 'Issuer of currency', 'Accepting deposits from the public', 'Regulator of the banking system'],
    correctAnswer: 2,
    subject: 'Economics',
    unit: 'Banking and Finance',
    type: 'competitive',
    examCategory: 'Banking',
  },
  {
    id: 'comp-6',
    question: 'The battle of Plassey was fought in?',
    options: ['1757', '1764', '1857', '1782'],
    correctAnswer: 0,
    subject: 'History',
    unit: 'Modern Indian History',
    type: 'competitive',
    examCategory: 'UPSC',
  },
];
