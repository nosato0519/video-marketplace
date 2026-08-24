# Distribution Package V1

## Goal
Define the commercial ZIP package so a buyer receives a complete, understandable product rather than only application source files.

## Package contents
- application source/build;
- guided installer;
- environment/configuration example;
- installation manual;
- administrator manual;
- seller manual;
- buyer-facing configuration guide;
- security hardening guide;
- backup/restore guide;
- update/migration guide;
- troubleshooting guide;
- FAQ;
- license and usage terms;
- release notes;
- compatibility requirements;
- test/verification report for the release;
- sample/demo configuration where legally and technically appropriate.

## First-run experience
After installation, the administrator should see a setup checklist with the minimum steps required before opening the marketplace to real users.

## Documentation principle
Instructions must be written for a non-programmer first. Advanced deployment notes may be provided separately for developers/hosting professionals.

## Versioning
Every distribution ZIP has a version identifier. Documentation, database migrations and compatibility requirements must match that version.

## Reproducibility
The release package must be buildable/reproducible from the repository state and should not contain private development secrets, real customer data or undocumented dependencies.

## Pre-sale verification
Before publishing a commercial ZIP:
1. Build the release package.
2. Verify required files are present.
3. Install into a clean environment.
4. Run the QA matrix.
5. Run security release gates.
6. Verify documentation against the actual UI and configuration.
7. Record known limitations.
8. Create release notes.
9. Only then mark the package as commercially ready.

## Important licensing note
The final sales license must explicitly state what the buyer may install, modify, operate and redistribute, and what is prohibited. The license must be reviewed before commercial release rather than inferred from marketing copy.
