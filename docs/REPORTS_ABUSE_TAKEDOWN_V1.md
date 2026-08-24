# Reports, Abuse & Takedown V1

## Goal
Provide a clear, auditable way to handle copyright/rights complaints, unauthorized redistribution, abusive accounts, prohibited content and other marketplace reports.

## Report types
- copyright/rights concern;
- unauthorized redistribution;
- prohibited content;
- misleading product/listing;
- payment/order abuse;
- account abuse;
- security concern;
- other policy violation.

## Report lifecycle
`submitted` -> `triaged` -> `investigating` -> `action_required` / `no_violation` -> `resolved` / `appealed`

## Evidence
Store references to relevant orders, products, accounts and timestamps. Minimize personal data and never require reporters to submit passwords, payment secrets or unrelated sensitive information.

## Actions
Depending on policy and evidence:
- request changes;
- temporarily restrict listing;
- suspend product;
- suspend seller/account;
- restore content;
- issue/refuse refund according to policy;
- preserve audit evidence;
- escalate for legal review where required.

## Security
- Reporters cannot change another user's case.
- Sellers cannot close their own enforcement cases.
- Only authorized roles can suspend/restore content.
- Enforcement actions are server-side authorized and audited.

## Redistribution response
The platform should support evidence collection and traceability such as buyer-specific watermarking where enabled. It must not promise that copying is impossible. The response workflow should focus on detection, investigation, takedown and account/purchase enforcement where justified.

## Appeals
A seller/user can request review according to configured policy. Appeals receive their own status and audit history.

## Adult deployments
Adult-content operators must configure content/consent, age/eligibility, prohibited-content and takedown policies appropriate to their jurisdiction, providers and business model. The software cannot determine legal compliance automatically for every jurisdiction.

## Tests
- Report creation and status transitions are authorized.
- Suspended products follow configured purchase/access policy.
- Restoration requires appropriate permission.
- Every enforcement action has an audit event.
- Reporter/seller cannot access unrelated private cases.
