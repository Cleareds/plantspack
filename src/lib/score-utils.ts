export interface CityScore {
  city: string
  country: string
  score: number
  grade: string
  fvCount: number
  placeCount: number
  perCapita?: number
  center?: [number, number]
  breakdown?: {
    accessibility: number
    choice: number
    variety: number
    quality: number
  }
}

// 9-tier grade system. The + tiers sit at the top of each bucket so a
// city clearly ahead of its peers in-bucket gets visible credit without
// jumping to the next letter. Added after user feedback on Lemmy that
// C and C+ should be distinguishable.
export function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-emerald-500'
  if (grade.startsWith('B')) return 'text-green-500'
  if (grade.startsWith('C')) return 'text-yellow-500'
  if (grade.startsWith('D')) return 'text-orange-500'
  return 'text-red-500'
}

export function getScoreBarColor(score: number): string {
  if (score >= 78) return 'bg-emerald-500'
  if (score >= 62) return 'bg-green-500'
  if (score >= 45) return 'bg-yellow-500'
  if (score >= 30) return 'bg-orange-500'
  return 'bg-red-500'
}

export function computeGrade(score: number): string {
  if (score >= 88) return 'A+'
  if (score >= 78) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 62) return 'B'
  if (score >= 54) return 'C+'
  if (score >= 45) return 'C'
  if (score >= 37) return 'D+'
  if (score >= 30) return 'D'
  return 'F'
}

// All grades in descending order — used by anything that iterates the full
// ladder (e.g. "points to next grade" calculation).
export const GRADE_THRESHOLDS = [
  { grade: 'A+', min: 88 },
  { grade: 'A', min: 78 },
  { grade: 'B+', min: 70 },
  { grade: 'B', min: 62 },
  { grade: 'C+', min: 54 },
  { grade: 'C', min: 45 },
  { grade: 'D+', min: 37 },
  { grade: 'D', min: 30 },
] as const
