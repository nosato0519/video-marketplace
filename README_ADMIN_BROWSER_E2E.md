# Admin browser acceptance

This suite validates the authenticated Admin browser surface using Playwright route mocks for API contracts.

Coverage:
- logged-out `/admin` redirect
- current Admin dashboard navigation contract
- seller-application review screen loading

Real database/provider integration remains covered by the existing regression and clean-install gates.
