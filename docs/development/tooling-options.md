# Development tooling options

The project uses GitHub as its current source of truth. GitHub hosts Git repositories and provides planning, review, testing, deployment, and collaboration workflows around Git. Other platforms can provide similar Git-based workflows, including GitLab, but changing platforms is not necessary for the current project.

## Current choice

- Repository: GitHub
- Source of truth: Git history and committed files
- Development environment: compatible with Codespaces/local Git workflows
- CI: GitHub Actions

## Important distinction

Git is the version-control engine. GitHub is the hosted collaboration and development platform around Git. This distinction means the project's underlying Git history is portable even if the hosting platform changes later.
