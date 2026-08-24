# Multilingual Documentation V1

## Goal
Make the commercial product understandable to users in Japan and overseas without maintaining contradictory instructions.

## Documentation languages
Initial documentation targets:
- Japanese (`ja`)
- English (`en`)

Additional locales can be added using the same source structure.

## Translation rules
- Feature names must match the actual UI.
- Security/legal wording must preserve limitations and must not become stronger through translation.
- Installation steps must use locale-neutral screenshots or clearly labeled locale-specific screenshots.
- Version numbers, commands and configuration keys are never translated.
- Provider names and technical identifiers remain exact.

## Document set
Each supported language should contain:
1. Quick start
2. Installation
3. Administrator guide
4. Seller guide
5. Buyer experience/configuration guide
6. Security hardening
7. Backup and restore
8. Updates and migrations
9. Troubleshooting
10. FAQ
11. License summary
12. Release notes

## Version synchronization
Every translated document carries the same product version. When a feature changes, the source documentation and affected translations must be reviewed before release.

## UI localization
The application should use translation keys rather than hard-coded UI strings. Dates, numbers and currency formatting must use locale-aware formatting.

## Quality gate
A translation is not considered release-ready if a step, button name or configuration field does not exist in that release. Known translation gaps must be documented rather than silently inventing instructions.
