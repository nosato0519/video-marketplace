# Commercial Package Manifest

## Include

- `app/` browser application files required by the storefront, buyer, seller, and admin UI.
- `admin/` public admin entrypoint files required by the application.
- `backend/` source, migrations, scripts, tests, and `package.json`.
- `.github/workflows/` regression workflows useful for deployment verification.
- `README.md` installation and verification guide.
- `SELLER_HANDOFF_GUIDE.md` purchaser handoff and deployment requirements.
- `OPERATIONS_MANUAL.md` operator procedures.
- `PRODUCT_VISION.md` product scope and completion blueprint.
- `docs/` backup, production configuration, and release documentation.
- `tests/` browser acceptance checklist and test documentation.

## Exclude

Never distribute:

- `backend/.env` or any file containing real secrets;
- production database dumps;
- production media/video files unless explicitly licensed and included by contract;
- private storage credentials or provider tokens;
- payment-provider live credentials;
- customer/buyer/seller personal data;
- deployment-specific TLS private keys;
- `node_modules/` unless a separate offline distribution is intentionally prepared and licensed;
- temporary uploads, logs, caches, local media data, and generated runtime files.

## Before packaging

1. Start from a clean checkout of the intended release commit.
2. Confirm no secrets or customer data are tracked.
3. Confirm `.env.example` contains configuration names but no credentials.
4. Run the applicable regression suite.
5. Run a clean-install test in an isolated environment.
6. Perform the browser acceptance checklist in a real browser before calling the product release-ready.
7. Verify backup/restore procedures in an isolated environment.
8. Review third-party licenses and final commercial license terms.
9. Review privacy, consumer, payment, seller, content, copyright/takedown and jurisdiction-specific requirements before selling or operating the system.

## Important release boundary

The software package is not the same thing as a live marketplace. A purchaser must separately configure hosting, domain/DNS, database, storage, payment provider, email, monitoring, backups and any legally required registrations or agreements unless the sales contract explicitly includes them.
