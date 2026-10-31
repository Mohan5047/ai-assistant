export function formatDate(dateInput: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString(undefined, options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(dateInput: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleTimeString(undefined, options || {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTime(dateInput: string | Date): string {
  return `${formatDate(dateInput)} at ${formatTime(dateInput)}`;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isToday(dateInput: string | Date): boolean {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isSameDay(date, new Date());
}

export function isPast(dateInput: string | Date): boolean {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date < now;
}

export function getMonthMatrix(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 is Sunday

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDayOfWeek);

  const matrix: Date[][] = [];
  let current = new Date(startDate);

  for (let week = 0; week < 6; week++) {
    const row: Date[] = [];
    for (let day = 0; day < 7; day++) {
      row.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    matrix.push(row);
    // Break early if we've moved past the month and completed at least 4 weeks
    if (current.getMonth() !== month && week >= 4) {
      break;
    }
  }

  return matrix;
}

export function getWeekDays(referenceDate: Date): Date[] {
  const dayOfWeek = referenceDate.getDay();
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - dayOfWeek);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}
