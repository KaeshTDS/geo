
export interface Adventure {
  id: string;
  title: string;
  location: string;
  era: string;
  summary: string;
  sections: StorySection[];
  quiz: QuizQuestion[];
  coverImage?: string;
}

export interface StorySection {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface UserProfile {
  id: string;
  name: string;
  type: 'child' | 'parent';
  avatar: string;
  completedAdventures: string[];
  totalScore: number;
  lastLogin: string;
  language: string; // Added language preference
}

export interface AdventureProgress {
  adventureId: string;
  score: number;
  completed: boolean;
  date: string;
}
