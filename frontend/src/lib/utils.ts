import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getHeatColor(level: string): string {
  const colors: Record<string, string> = {
    Mild: 'bg-green-500',
    Medium: 'bg-yellow-500',
    Hot: 'bg-orange-500',
    'Extra Hot': 'bg-red-600',
  }
  return colors[level] || 'bg-gray-500'
}

export function getHeatTextColor(level: string): string {
  const colors: Record<string, string> = {
    Mild: 'text-green-600',
    Medium: 'text-yellow-600',
    Hot: 'text-orange-600',
    'Extra Hot': 'text-red-600',
  }
  return colors[level] || 'text-gray-600'
}

export function getSHURange(level: string): [number, number] {
  const ranges: Record<string, [number, number]> = {
    Mild: [0, 5000],
    Medium: [5001, 15000],
    Hot: [15001, 50000],
    'Extra Hot': [50001, 500000],
  }
  return ranges[level] || [0, 0]
}
