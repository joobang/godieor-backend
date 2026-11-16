// All dates are Korean calendar months. Never infer an OTT premiere from this window.
export function scheduleMonths(now = new Date(), count = 2) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime()) || !Number.isInteger(count) || count < 1 || count > 12)
    throw Error('INVALID_OTT_WINDOW');
  const korean = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' });
  const parts = Object.fromEntries(korean.formatToParts(now).map(({ type, value }) => [type, value]));
  return Array.from({ length: count }, (_, n) => {
    const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1 + n, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

export function configuredMonths() {
  const value = process.env.GODIEOR_OTT_MONTHS;
  if (!value) return scheduleMonths();
  const months = value.split(',');
  if (!months.length || months.length > 12 || months.some((m) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) ||
      new Set(months).size !== months.length) throw Error('INVALID_OTT_MONTHS');
  return months;
}
