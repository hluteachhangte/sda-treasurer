export function normalizeDateString(value) {
  if (!value) return "";
  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const localMatch = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (localMatch) return `${localMatch[3]}-${localMatch[2]}-${localMatch[1]}`;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function recordMatchesDateRange(record = {}, filters = {}) {
  if (!filters.fromDate && !filters.toDate) return true;

  const recordDate = normalizeDateString(record.date);
  if (!recordDate) return false;
  if (filters.fromDate && recordDate < normalizeDateString(filters.fromDate)) return false;
  if (filters.toDate && recordDate > normalizeDateString(filters.toDate)) return false;
  return true;
}

export function formatDateDash(value) {
  const normalized = normalizeDateString(value);
  if (!normalized) return "";
  const [year, month, day] = normalized.split("-");
  return `${day}-${month}-${year}`;
}

export function getDateRangeLabel(filters = {}) {
  const fromDate = normalizeDateString(filters.fromDate);
  const toDate = normalizeDateString(filters.toDate);
  if (fromDate && toDate && fromDate === toDate) return formatDateDash(fromDate);
  if (fromDate && toDate) return `${formatDateDash(fromDate)} to ${formatDateDash(toDate)}`;
  if (fromDate) return `From ${formatDateDash(fromDate)}`;
  if (toDate) return `Up to ${formatDateDash(toDate)}`;
  return "";
}
