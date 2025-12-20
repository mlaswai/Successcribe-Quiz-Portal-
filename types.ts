
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface QuizResult {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  totalTime: number; // in seconds
  date: number;
}

export enum QuizState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED'
}
