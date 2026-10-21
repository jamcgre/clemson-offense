export function isSeasonPartial(season: number, now = new Date()): boolean {
  const month = now.getMonth();
  if (season === now.getFullYear() && month >= 7) return true;
  if (season === now.getFullYear() - 1 && month === 0) return true;
  return false;
}
