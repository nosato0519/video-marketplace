# License and Software Resale Protection V1

## Goal
Protect the commercial value of the marketplace software itself, separately from protection of videos/content sold through the marketplace.

## Product model
The sellable ZIP must include a clearly defined software license. The default commercial license should specify exactly what the purchaser may do, such as:
- install the software on permitted domains/environments;
- modify source code for their own deployment;
- operate a marketplace under their own brand;
- create backups for their own use;
- use included documentation and assets within the licensed deployment.

The license must separately state whether the purchaser may:
- resell the original ZIP;
- sublicense the source code;
- redistribute modified copies;
- provide the software as a hosted service to third parties;
- remove attribution/credits where applicable.

## Important distinction
Technical controls cannot reliably prevent a buyer with source-code access from copying source files. The primary protection against unauthorized software resale is therefore the **license/contract + commercial packaging + optional technical licensing controls**, not a claim of impossible copying.

## Technical measures
Where compatible with the chosen license and product model:
- signed license/activation records;
- domain/installation registration;
- optional activation limits;
- update entitlement checks;
- signed release manifests;
- purchaser-specific license identifiers;
- server-side validation for premium hosted integrations.

The self-hosted core must not be made dependent on an opaque remote service merely to function unless that dependency is explicitly disclosed in the sales materials.

## Do not do
- Do not hide malicious code or backdoors as an anti-piracy mechanism.
- Do not collect unnecessary personal data for licensing.
- Do not claim that source code cannot be copied.
- Do not silently disable a legitimate customer's site because of a heuristic false positive.
- Do not ship private keys, signing secrets or internal credentials in the ZIP.

## Abuse response
Provide an operator process for suspected unauthorized redistribution:
1. preserve evidence and release/license identifiers;
2. verify the applicable license terms;
3. identify the distributed copy where reasonably possible;
4. contact the responsible party or hosting/provider where appropriate;
5. issue a formal notice when warranted;
6. revoke optional update/support/license services when contractually permitted;
7. keep an internal incident record.

## Sales-package requirement
The ZIP product must contain:
- `LICENSE.md`
- third-party attribution notices
- acceptable-use terms
- update/support terms
- installation/domain entitlement explanation if licensing controls are enabled
- clear statement of what the buyer can and cannot redistribute.

The final legal wording must be reviewed for the actual jurisdiction and business model before commercial release.
