# Transfer and handoff requirements

The marketplace must be deployable and operable by a new owner without relying on the original developer's undocumented knowledge.

## Configuration

- All domain, email, payment, storage, and external-service settings are environment/configuration values.
- No personal accounts, personal email addresses, or developer-specific credentials are embedded in application code.
- Production secrets are supplied separately during deployment.

## Handoff package

- Deployment instructions
- Environment variable reference
- Database migration and backup instructions
- Administrator setup
- Seller and buyer workflow documentation
- Payment/refund configuration
- Storage/video delivery configuration
- Support and security contact configuration
- Monitoring and incident response procedures
- Upgrade and rollback instructions
- Known limitations and third-party dependencies

## Acceptance standard

A new operator should be able to install the application, configure their own domain and service accounts, run the verification checks, create an administrator, and operate the marketplace without modifying application source code merely to change ownership or branding.
