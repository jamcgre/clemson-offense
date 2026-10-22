export function isSeasonPartial(season: number, now = new Date()): boolean {
  const month = now.getMonth();
  if (season === now.getFullYear() && month >= 7) return true;
  if (season === now.getFullYear() - 1 && month === 0) return true;
  return false;
}

// August through December uses the calendar year. January still belongs to the
// season that started the previous fall. February through July are the offseason.
export function liveSeasonYear(now = new Date()): number | null {
  const month = now.getMonth();
  if (month >= 7) return now.getFullYear();
  if (month === 0) return now.getFullYear() - 1;
  return null;
}
