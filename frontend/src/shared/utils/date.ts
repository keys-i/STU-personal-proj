export function isoFromDateInput(v: string): string | undefined {
  const s = v.trim();
  if (!s) return undefined;

  // require YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;

  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const day = Number(m[3]); // 1-31

  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (Number.isNaN(d.getTime())) return undefined;

  // detect rollover (e.g. Feb 30 -> Mar 2)
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return undefined;
  }

  return d.toISOString();
}

const dateFmtOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const fmt = new Intl.DateTimeFormat(undefined, dateFmtOptions);
  return fmt.format(d);
}
