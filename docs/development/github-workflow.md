# GitHub development workflow

This project uses GitHub as the source of truth for the codebase.

## What is preserved

- Source code and configuration
- Security policies and regression suites
- CI workflow definitions
- Commit history for milestones
- Branches used for isolated changes

## Recommended workflow

1. Start work from the current repository state.
2. Make a focused change.
3. Run relevant tests locally or through CI.
4. Commit the change with a descriptive message.
5. Continue from the latest commit, even when the chat session changes.

## Recovery after a chat change

The repository should be inspected before continuing work. Do not rely only on conversational memory; use the latest committed code and history as the authoritative project state.
