# Distribution product requirements v0.1

The application is being built as a product that the operator can use first and later package and sell as a self-hosted ZIP distribution. Distribution requirements must therefore be considered during development, not added at the end.

## Buyer of the software
The eventual software buyer may be a non-programmer. The distribution must explain what is required before installation and provide a guided setup path.

## Release package
A production-ready release package should contain, as applicable:
- application source/build output required by the chosen license;
- database migrations/schema;
- configuration template with safe placeholders, never real secrets;
- installation guide;
- first-run setup guide;
- administrator manual;
- seller manual;
- buyer/user manual;
- moderation and safety manual;
- payment-provider setup guide;
- video storage/processing setup guide;
- localization guide;
- backup and restore guide;
- update/upgrade guide;
- troubleshooting guide;
- security hardening checklist;
- legal/compliance deployment checklist;
- release notes/changelog;
- license and third-party attribution notices;
- test/sandbox checklist;
- production launch checklist.

## Installer philosophy
Prefer a guided setup experience over manual file editing. Technical configuration that genuinely cannot be safely automated must have an explicit explanation, validation and recovery instructions.

## Portability
Avoid unnecessary vendor lock-in. External integrations such as payment, email, object storage, video processing and currency/FX services should be isolated behind replaceable adapters where practical.

## Environment separation
The package must support development, test/sandbox and production environments without copying production secrets into the package.

## Upgrade safety
- Database migrations are versioned.
- Backups are recommended/validated before destructive migrations.
- The release should show compatible upgrade paths.
- Rollback limitations must be documented honestly.
- Configuration changes should be migration-safe where possible.

## License and sales readiness
Before commercial distribution, the operator must choose and document the software license, confirm rights to every included dependency/asset, identify components that require source or attribution notices, and remove all project-specific secrets, credentials and private data.

## Quality gate
The ZIP is not considered sellable merely because it extracts successfully. A release candidate must pass installation, setup, admin, seller, buyer, media, commerce sandbox, localization, security and backup/restore tests in a clean environment.
