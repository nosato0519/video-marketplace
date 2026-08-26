const MAX_EVIDENCE_ITEMS = 10;
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;

export function validateReportEvidence({ evidence = [] }) {
  if (!Array.isArray(evidence) || evidence.length > MAX_EVIDENCE_ITEMS) throw new Error('invalid_evidence_count');
  return evidence.map((item) => {
    if (!item?.type || !item?.reference) throw new Error('invalid_evidence_item');
    if (Number(item.size ?? 0) > MAX_EVIDENCE_SIZE) throw new Error('evidence_too_large');
    return {
      type: item.type,
      reference: item.reference,
      size: Number(item.size ?? 0),
      sha256: item.sha256 ?? null,
    };
  });
}

export function attachEvidenceToReport({ report, evidence }) {
  if (!report?.id) throw new Error('report_required');
  return { ...report, evidence: validateReportEvidence({ evidence }), evidenceAttachedAt: new Date().toISOString() };
}
