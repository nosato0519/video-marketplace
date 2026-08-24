const MODERATION_ROLES = new Set(['moderator', 'admin']);

export function assertCanModerate(user) {
  if (!user) throw new Error('authentication_required');
  if (!MODERATION_ROLES.has(user.role)) throw new Error('forbidden');
}

export function applyReportDecision({ user, report, decision, resolutionNote = '' }) {
  assertCanModerate(user);
  if (!report) throw new Error('report_not_found');
  if (!['open', 'reviewing'].includes(report.status)) throw new Error('report_not_actionable');

  if (decision === 'resolve') {
    if (!resolutionNote.trim()) throw new Error('resolution_note_required');
    return {
      status: 'resolved',
      assigned_to: user.id,
      resolution_note: resolutionNote.trim().slice(0, 2000),
    };
  }

  if (decision === 'dismiss') {
    return {
      status: 'dismissed',
      assigned_to: user.id,
      resolution_note: resolutionNote.trim().slice(0, 2000),
    };
  }

  throw new Error('invalid_report_decision');
}

export function moderationActionForReport({ report, resourceStatus, decision }) {
  if (decision !== 'resolve') return { resourceStatus };
  if (report.resource_type === 'product' && report.reason_code === 'policy_violation') {
    return { resourceStatus: 'suspended' };
  }
  return { resourceStatus };
}
