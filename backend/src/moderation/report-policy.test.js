import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanModerate,
  applyReportDecision,
  moderationActionForReport,
  REPORT_REASON_CODES
} from './report-policy.js';

test('moderation requires an authenticated admin', () => {
  assert.throws(() => assertCanModerate(null), /authentication_required/);
  assert.throws(() => assertCanModerate({ id: 'u1', role: 'seller' }), /forbidden/);
  assert.throws(() => assertCanModerate({ id: 'u1', role: 'moderator' }), /forbidden/);
  assert.doesNotThrow(() => assertCanModerate({ id: 'u1', role: 'admin' }));
});

test('report reason codes match the public report API contract', () => {
  assert.deepEqual([...REPORT_REASON_CODES].sort(), [
    'abuse',
    'copyright',
    'illegal_content',
    'other',
    'privacy',
    'prohibited_content'
  ]);
});

test('resolve requires a human-readable resolution note', () => {
  assert.throws(
    () => applyReportDecision({ user: { id: 'admin-1', role: 'admin' }, report: { id: 'r1', status: 'open' }, decision: 'resolve' }),
    /resolution_note_required/
  );

  const result = applyReportDecision({
    user: { id: 'admin-1', role: 'admin' },
    report: { id: 'r1', status: 'reviewing' },
    decision: 'resolve',
    resolutionNote: 'Confirmed policy violation and removed the listing.'
  });
  assert.equal(result.status, 'resolved');
  assert.equal(result.assigned_to, 'admin-1');
});

test('dismiss records reviewer ownership and optional note', () => {
  const result = applyReportDecision({
    user: { id: 'admin-1', role: 'admin' },
    report: { id: 'r2', status: 'open' },
    decision: 'dismiss',
    resolutionNote: 'No actionable violation found.'
  });
  assert.deepEqual(result, {
    status: 'dismissed',
    assigned_to: 'admin-1',
    resolution_note: 'No actionable violation found.'
  });
});

test('closed reports cannot be changed and invalid decisions are rejected', () => {
  const user = { id: 'admin-1', role: 'admin' };
  assert.throws(() => applyReportDecision({ user, report: { status: 'resolved' }, decision: 'dismiss' }), /report_not_actionable/);
  assert.throws(() => applyReportDecision({ user, report: { status: 'open' }, decision: 'suspend' }), /invalid_report_decision/);
});

test('supported product report reasons suspend the resource on resolution', () => {
  for (const reasonCode of REPORT_REASON_CODES) {
    const result = moderationActionForReport({
      report: { resource_type: 'product', reason_code: reasonCode },
      resourceStatus: 'published',
      decision: 'resolve'
    });
    assert.equal(result.resourceStatus, 'suspended', reasonCode);
  }
});

test('dismissal does not change the resource status', () => {
  const result = moderationActionForReport({
    report: { resource_type: 'product', reason_code: 'copyright' },
    resourceStatus: 'published',
    decision: 'dismiss'
  });
  assert.equal(result.resourceStatus, 'published');
});
