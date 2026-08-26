import { buildAuditIntegrityHash, verifyAuditChain } from './audit-log-integrity-policy.js';

export function runAuditIntegrityRegressionSuite() {
  const first = { action: 'suspend', performedBy: 'admin-1', targetUserId: 'user-1', reason: 'security review', createdAt: '2026-08-26T00:00:00.000Z' };
  const second = { action: 'lock', performedBy: 'admin-1', targetUserId: 'user-2', reason: 'repeated risk', createdAt: '2026-08-26T00:01:00.000Z' };
  const firstHash = buildAuditIntegrityHash({ entry: first });
  const secondHash = buildAuditIntegrityHash({ entry: second, previousHash: firstHash });
  const validChain = [
    { ...first, integrityHash: firstHash },
    { ...second, integrityHash: secondHash },
  ];
  const tamperedChain = [
    validChain[0],
    { ...validChain[1], reason: 'changed after the fact' },
  ];

  return {
    validChainAccepted: verifyAuditChain({ entries: validChain }),
    tamperedChainRejected: !verifyAuditChain({ entries: tamperedChain }),
  };
}
