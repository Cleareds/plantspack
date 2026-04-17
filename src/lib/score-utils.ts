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

export function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-emerald-500'
  if (grade === 'B') return 'text-green-500'
  if (grade === 'C') return 'text-yellow-500'
  if (grade === 'D') return 'text-orange-500'
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
  if (score >= 62) return 'B'
  if (score >= 45) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}
