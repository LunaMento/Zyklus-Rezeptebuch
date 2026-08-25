const PHASE_RANGES = [
  { id: "menstruation", from: 1, to: 5 },
  { id: "follikel", from: 6, to: 13 },
  { id: "ovulation", from: 14, to: 16 },
  { id: "luteal", from: 17, to: Infinity },
];

const DEFAULT_CYCLE_LENGTH = 28;

function toDateOnly(value) {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from, to) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((toDateOnly(to) - toDateOnly(from)) / msPerDay);
}

function sortByDateAsc(entries) {
  return [...entries].sort((a, b) => new Date(a.period_start) - new Date(b.period_start));
}

export function getLatestEntry(entries) {
  if (!entries || entries.length === 0) return null;
  return sortByDateAsc(entries).at(-1);
}

// Durchschnitt der Abstände zwischen aufeinanderfolgenden Periodenstarts.
// Mit weniger als zwei Einträgen gibt es noch keinen Abstand zu messen -> Standardwert.
export function getAverageCycleLength(entries) {
  const sorted = sortByDateAsc(entries || []);
  if (sorted.length < 2) return DEFAULT_CYCLE_LENGTH;

  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(daysBetween(sorted[i - 1].period_start, sorted[i].period_start));
  }
  return Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length);
}

// Zykustag seit dem letzten eingetragenen Periodenstart (Tag 1 = Starttag).
export function getCurrentCycleDay(entries, today = new Date()) {
  const latest = getLatestEntry(entries);
  if (!latest) return null;
  return daysBetween(latest.period_start, today) + 1;
}

export function getPhaseForDay(day) {
  if (day == null) return null;
  const range = PHASE_RANGES.find((p) => day >= p.from && day <= p.to);
  return range ? range.id : "luteal";
}

// Formatiert ein Datum als "YYYY-MM-DD" in lokaler Zeit (nicht toISOString(),
// das würde nachts durch die UTC-Umrechnung auf den falschen Tag springen).
export function toISODateString(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getPredictedNextPeriod(entries) {
  const latest = getLatestEntry(entries);
  if (!latest) return null;
  const avgLength = getAverageCycleLength(entries);
  const start = toDateOnly(latest.period_start);
  const next = new Date(start);
  next.setDate(next.getDate() + avgLength);
  return next;
}
