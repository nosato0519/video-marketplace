const REPORT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REPORTS_PER_USER = 10;

export function validateSecurityReport({ reporterId, category, details, now = new Date() }) {
  if (!reporterId) throw new Error('reporter_required');
  if (typeof category !== 'string' || category.trim().length < 2) throw new Error('report_category_required');
  if (typeof details !== 'string' || details.trim().length < 5 || details.length > 5000) throw new Error('invalid_report_details');
  return {
    reporterId,
    category: category.trim(),
    details: details.trim(),
    createdAt: now.toISOString(),
  };
}

export function shouldThrottleSecurityReports({ reports = [], reporterId, now = Date.now() }) {
  const recent = reports.filter((report) => report.reporterId === reporterId && now - new Date(report.createdAt).getTime() < REPORT_WINDOW_MS);
  return recent.length >= MAX_REPORTS_PER_USER;
}
