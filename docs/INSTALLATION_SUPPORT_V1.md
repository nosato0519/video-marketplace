# Installation & Support Quality Standard V1

## Objective
Minimize post-sale complaints caused by unclear installation, missing prerequisites, broken defaults, or undocumented limitations.

## Buyer journey must be documented
1. What is included in the ZIP
2. Minimum and recommended server requirements
3. Supported hosting environments
4. Domain and HTTPS requirements
5. Database setup
6. Environment variables and where to obtain them
7. First-run installer
8. Creating the first administrator
9. Storage configuration
10. Email configuration
11. Payment provider sandbox setup
12. Video processing/storage configuration
13. Cron/queue/background worker setup if required
14. Initial security checklist
15. Going live
16. Backup and restore
17. Updates and rollback
18. Troubleshooting

## Installer requirements
The installer should:
- detect missing prerequisites before installation;
- explain each failure in plain language;
- validate database connectivity;
- validate writable directories;
- validate required environment settings;
- generate safe application secrets when appropriate;
- create the initial admin account securely;
- run migrations in a controlled way;
- provide a clear success screen and next steps;
- prevent accidental re-installation over an existing deployment.

## First-run experience
After installation, show a setup checklist rather than an empty dashboard. The checklist should cover:
- site identity
- default language
- currencies
- email
- storage
- payments
- moderation settings
- legal/policy pages
- seller settings
- security
- backup

Each item should link directly to the relevant settings screen.

## Documentation quality
Every major feature needs:
- what it does;
- when to use it;
- prerequisites;
- step-by-step procedure;
- expected result;
- common errors and fixes;
- security notes;
- rollback/recovery instructions where relevant.

Documentation must avoid unexplained developer terminology. Technical details remain available in an advanced section.

## Pre-sale transparency
The sales page and README must clearly state:
- what is included;
- what is not included;
- supported environments;
- third-party accounts/services that may be required;
- payment-provider availability depends on region/category/provider policy;
- hosting and infrastructure costs are separate unless explicitly included;
- legal/compliance configuration remains the operator's responsibility.

## Release acceptance
Before selling a ZIP, perform a clean installation using only the buyer documentation. The tester should not use undocumented developer knowledge. Any point where the tester gets stuck becomes a documentation or product defect and must be fixed before release.

## Support-minded design
Prefer preventing support tickets over explaining them later. If a common error can be detected automatically, detect it in the UI. If a configuration is required, expose it as a setup check. If a task is dangerous, provide confirmation and recovery guidance.
