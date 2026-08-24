# Installer UX V1

## Goal
A buyer of the ZIP package should be able to install the marketplace with minimal technical knowledge, while the installer prevents unsafe or incomplete configurations.

## Guided steps
1. Welcome and license acceptance
2. Environment check
3. Database configuration
4. Storage configuration
5. Application URL / HTTPS guidance
6. Mail configuration
7. Payment provider configuration
8. Locale/currency defaults
9. Admin account creation
10. Security checklist
11. Database migration/setup
12. Final verification
13. Remove/lock installer access

## Environment checks
Validate before continuing:
- supported runtime version;
- required extensions/dependencies;
- writable directories only where required;
- database connectivity;
- storage connectivity;
- sufficient temporary space where applicable;
- HTTPS/proxy expectations;
- required environment variables.

## Security
- Never display secrets after they are saved.
- Do not put production secrets into client-side configuration.
- Require strong administrator credentials.
- Prevent installer reuse after successful setup unless explicitly re-enabled by a safe procedure.
- Warn when running without HTTPS in a production-like environment.

## Error UX
Every failed step should state:
- what failed;
- why it matters;
- what the operator can check;
- a safe retry path;
- a support/reference ID where appropriate.

Do not expose stack traces, SQL statements, filesystem secrets or provider credentials.

## Non-technical acceptance
A first-time operator following the installation manual should be able to reach a healthy application without editing source code. If a provider or hosting environment requires manual infrastructure work, the installer must explain that requirement clearly rather than pretending it is automatic.

## Post-install
Show a concise checklist for:
- admin login;
- email test;
- payment sandbox test;
- sample product creation;
- upload test;
- buyer purchase test;
- protected playback test;
- backup configuration;
- security review.
