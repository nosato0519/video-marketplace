# Support email

The production marketplace should use a domain-based support mailbox rather than a personal mailbox.

## Recommended addresses

- `support@<production-domain>` — customer support and general inquiries
- `help@<production-domain>` — optional customer-facing alias
- `security@<production-domain>` — security reports and abuse escalation
- `no-reply@<production-domain>` — automated transactional email only

The production domain must be decided before launch. Until then, these are placeholders and must not be hard-coded as live addresses.

## Requirements

- Support mailbox must be monitored by the operator.
- Automated emails must use a separate no-reply sender.
- Security reports should be routed separately from general support.
- The website should display the support address consistently in the contact/help area and relevant transactional messages.
