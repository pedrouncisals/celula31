import { differenceInDays, startOfDay } from "date-fns";

export function calculateCurrentChapter(startDate: string): number {
  const start = startOfDay(new Date(startDate));
  const today = startOfDay(new Date());
  const daysBetween = differenceInDays(today, start);
  return Math.max(1, daysBetween + 1);
}

export function isChapterUnlocked(roomStartDate: string, chapterNumber: number): boolean {
  const currentChapter = calculateCurrentChapter(roomStartDate);
  return chapterNumber <= currentChapter;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function canEditSummary(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
}

