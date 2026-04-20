/** Convert a UTC date string from the database to SAST for display */
export function formatUTCtoSAST(dateStr: string, timeStr: string): string {
  const utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
  return utcDate.toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

/** Get the minimum bookable time in SAST (current time + 1 hour),
 *  rounded to the nearest 30-minute slot */
export function getMinBookableTimeSAST(): string {
  const nowSAST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Johannesburg" })
  );
  nowSAST.setMinutes(nowSAST.getMinutes() + 60);
  const hh = String(nowSAST.getHours()).padStart(2, "0");
  const mm = nowSAST.getMinutes() >= 30 ? "30" : "00";
  return `${hh}:${mm}`;
}