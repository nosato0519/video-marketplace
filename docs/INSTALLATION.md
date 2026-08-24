# Installation Manual

## 1. Before installation

Prepare:

- A supported production server or hosting environment
- A domain name and HTTPS/TLS certificate
- A supported database
- Private object storage for video assets
- CDN/authorized video delivery where required
- Transactional email service
- A supported payment provider account
- A payout provider/account for seller payouts
- Required provider API keys
- A secure administrator email address

Do not put production secrets in Git, source code, screenshots or documentation.

## 2. Package installation

1. Download the release package.
2. Extract it on the target server.
3. Install the runtime dependencies specified by the release.
4. Copy the example environment configuration to the production environment.
5. Generate strong, unique secrets for the application.
6. Configure the database connection.
7. Configure private media storage.
8. Configure the email provider.
9. Configure payment and payout providers.
10. Run the database migrations supplied with the release.
11. Create the first administrator account using the supported setup flow.
12. Enable HTTPS before opening the site to public users.
13. Complete the initial configuration in the admin panel.

## 3. Initial configuration

Set at minimum:

- Site name and branding
- Default language
- Enabled languages
- Default currency
- Supported currencies
- Country/region availability
- Time zone defaults
- Seller registration policy
- Seller verification policy
- Content moderation policy
- Download policy defaults
- Platform fee/revenue-share rules
- Refund policy
- Email sender configuration
- Storage/CDN configuration
- Payment methods
- Payout rules
- Legal/policy pages

## 4. Production verification

Before launch, test:

- Registration and email verification
- Login/logout and password reset
- Buyer purchase flow in payment sandbox
- Order history
- Video authorization
- Streaming
- Download policy
- Seller onboarding
- Seller upload and moderation
- Admin review and takedown
- Reporting
- Payout workflow in sandbox/test mode
- Language switching
- Currency display
- Mobile layout
- Access control
- Rate limiting
- Backup and restore
- Error handling and monitoring

Do not switch to live payment credentials until the complete test checklist passes.
