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

/**
 * Format any ISO timestamp from the server into SAST for display.
 * Use this everywhere you show a server-stored datetime to a user.
 */
export function formatSAST(
  isoString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  }
): string {
  if (!isoString) return '—';
  try {
    // Ensure string is treated as UTC if no offset present
    const normalized = isoString.endsWith('Z') || isoString.includes('+')
      ? isoString
      : `${isoString}Z`;
    return new Date(normalized).toLocaleString('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      ...options,
    });
  } catch {
    return '—';
  }
}

/**
 * Format a server ISO timestamp as date only in SAST.
 * e.g. "13 May 2026"
 */
export function formatSASTDate(isoString: string | null | undefined): string {
  return formatSAST(isoString, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a server ISO timestamp as time only in SAST.
 * e.g. "14:32"
 */
export function formatSASTTime(isoString: string | null | undefined): string {
  return formatSAST(isoString, {
    hour: '2-digit',
    minute: '2-digit',
  });
}