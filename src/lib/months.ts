import type { Month } from './dates'

export interface MonthInfo {
  n: Month
  name: string
  short: string
  /** pastel tile colour (year agenda page) */
  tileColor: string
  /** vivid month accent: giant name / header bar / weekly headings (sampled from the PDF) */
  accent: string
  /** a readable text version of the accent (only differs where the PDF accent is near-white) */
  accentInk: string
  /** full-page month calendar background */
  calendarBg: string
  /** 1-based PDF page of the month calendar */
  pageIndex: number
}

export const MONTHS: MonthInfo[] = [
  { n: 1, name: 'January', short: 'JAN', tileColor: '#dde6f3', accent: '#cecc64', accentInk: '#b7b44a', calendarBg: '#dde6f3', pageIndex: 8 },
  { n: 2, name: 'February', short: 'FEB', tileColor: '#e6d2e2', accent: '#5d79ba', accentInk: '#5d79ba', calendarBg: '#e6d2e2', pageIndex: 20 },
  { n: 3, name: 'March', short: 'MAR', tileColor: '#f6efab', accent: '#897fba', accentInk: '#897fba', calendarBg: '#f6efab', pageIndex: 32 },
  { n: 4, name: 'April', short: 'APR', tileColor: '#f6bdb6', accent: '#c11718', accentInk: '#c11718', calendarBg: '#f6bdb6', pageIndex: 46 },
  { n: 5, name: 'May', short: 'MAY', tileColor: '#e2d1e7', accent: '#f28f2f', accentInk: '#f28f2f', calendarBg: '#e2d1e7', pageIndex: 58 },
  { n: 6, name: 'June', short: 'JUN', tileColor: '#efd9af', accent: '#c972a3', accentInk: '#c972a3', calendarBg: '#efd9af', pageIndex: 70 },
  { n: 7, name: 'July', short: 'JUL', tileColor: '#fdd5a7', accent: '#3e599d', accentInk: '#3e599d', calendarBg: '#fcd4a6', pageIndex: 84 },
  { n: 8, name: 'August', short: 'AUG', tileColor: '#dbead5', accent: '#158370', accentInk: '#158370', calendarBg: '#dae9d4', pageIndex: 96 },
  { n: 9, name: 'September', short: 'SEP', tileColor: '#faebeb', accent: '#c55f3d', accentInk: '#c55f3d', calendarBg: '#f9eaea', pageIndex: 108 },
  { n: 10, name: 'October', short: 'OCT', tileColor: '#f7f0ac', accent: '#7caddd', accentInk: '#7caddd', calendarBg: '#f6efab', pageIndex: 122 },
  { n: 11, name: 'November', short: 'NOV', tileColor: '#d2eae9', accent: '#f5f3d0', accentInk: '#c9c58a', calendarBg: '#d1e9e8', pageIndex: 134 },
  { n: 12, name: 'December', short: 'DEC', tileColor: '#fdd5a8', accent: '#158370', accentInk: '#158370', calendarBg: '#fcd4a7', pageIndex: 146 },
]

export function monthInfo(n: number): MonthInfo {
  return MONTHS[Math.min(12, Math.max(1, n)) - 1]
}

export function parseMonthParam(v: string | undefined): Month | null {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 12 ? (n as Month) : null
}
