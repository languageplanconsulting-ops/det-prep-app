export function shuffleArray<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleMcOptions(options: string[], correctAnswer: string): {
  shuffled: string[];
  correctIndex: number;
} {
  const shuffled = shuffleArray(options);
  let correctIndex = shuffled.findIndex((o) => answersMatch(o, correctAnswer));
  if (correctIndex < 0) correctIndex = shuffled.indexOf(correctAnswer);
  if (correctIndex < 0) correctIndex = 0;
  return { shuffled, correctIndex };
}

export function answersMatch(user: string, correct: string): boolean {
  const n = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return n(user) === n(correct);
}
