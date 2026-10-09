# Customer Setup and Production Deployment Guide

This guide walks you through configuring VIDEO MARKETPLACE for your production environment. Prepare the application host, PostgreSQL database, private object storage, HTTPS, and payment provider in the order below. Complete the pre-launch checklist before opening the marketplace to users.

## 1. Requirements

- An application hosting environment that supports Node.js 20 or later
- A PostgreSQL database
- An HTTPS-enabled domain or hosting URL
- S3-compatible object storage for video files and identity-verification documents
- An account and API credentials for your chosen payment provider, including webhook signing secrets
- A hosting dashboard where production environment variables and secrets can be stored securely

Service plans, prices, and dashboards vary by provider. The environment variable names in this guide are the configuration names used by this application; use the actual values issued by your providers.

## 2. Prepare the database and application

1. Create a dedicated PostgreSQL database for production.
2. Review `backend/.env.example` and add the required environment variables to your hosting provider's environment-variable or secret settings.
3. Set production values for at least the following:
   - `NODE_ENV=production`
   - `PORT` (the port specified by your hosting provider)
   - `DATABASE_URL` (the connection URL for your production PostgreSQL database)
   - `SESSION_SECRET` (a long, unpredictable random value)
   - `APP_BASE_URL` (your public HTTPS URL, where required by the enabled features)
4. Run the API behind HTTPS, using your hosting provider's HTTPS feature or an HTTPS reverse proxy. Do not expose an internal application port directly to the public internet.
5. Confirm the target branch and commit before deployment, and prepare a database backup and migration plan.

Run backend database migrations according to `DEPLOYMENT.md`. Before running a migration, verify that the configured database URL points to the intended production database.

## 3. Configure video and identity-document storage

Do not use the application server's local disk as the production storage location for videos or identity-verification documents. Files may be lost during restarts or redeployments, and this application blocks local media storage in production.

### 3.1 Create object storage

1. Create an S3-compatible object-storage bucket.
2. Keep the bucket private.
3. Create access credentials with only the permissions needed to store, retrieve, and delete this application's objects.
4. Do not make the bucket public. Identity-verification documents must not be accessible to anyone through public URLs.

If you use an S3-compatible provider other than AWS S3, follow that provider's instructions for endpoint, region values, and access-key permissions.

### 3.2 Set the API service environment variables

Add these values to the **backend API service** environment-variable or secret settings:

| Variable | Value |
|---|---|
| `MEDIA_STORAGE_PROVIDER` | `s3` |
| `MEDIA_S3_BUCKET` | Name of your private bucket |
| `MEDIA_S3_REGION` | Region value specified by your storage provider |
| `MEDIA_S3_ACCESS_KEY_ID` | Issued access key ID |
| `MEDIA_S3_SECRET_ACCESS_KEY` | Issued secret access key |
| `MEDIA_S3_ENDPOINT` | Set only when your provider requires a custom endpoint |
| `MEDIA_URL_SECRET` | Optional; if set, use a secret value at least 32 characters long |
| `MEDIA_MAX_UPLOAD_BYTES` | Optional upload limit in bytes |

Never place access keys or secrets in source code, README files, chat messages, or Git history. Store them only in your hosting provider's environment-variable or secret settings.

Identity-verification uploads currently allow JPEG, PNG, and PDF files up to 10 MiB. Configure proxy and hosting request-size limits and timeouts to accommodate these uploads. Video upload limits may also depend on application settings and hosting limits.

After saving the environment variables, redeploy or restart the API service. Storage credentials must be available to the backend that accesses the object storage, not just to the frontend.

## 4. Use identity verification

### Seller workflow

1. Sign in with a seller account.
2. Complete the required seller profile fields and save the profile.
3. Make sure the operator settings enable document-based verification. If verification is configured as not required, document uploads are not accepted.
4. Open the identity-verification page and upload a JPEG, PNG, or PDF document (up to 10 MiB).
5. Confirm that the upload succeeds on screen, then submit the verification application.

### Operator workflow

1. Sign in with an operator account.
2. Open the seller identity-verification list and select a submitted application.
3. View the document and compare it with the seller's submitted information.
4. Choose approve, return for correction, or reject. Enter a reason when returning or rejecting an application.
5. Confirm that the application status has been updated.

Documents are stored in private object storage and retrieved through an authenticated operator API. A database record or an application appearing in the list alone does not replace viewing the actual uploaded document.

## 5. Required pre-launch checklist

Use a test seller account and test files to verify each item before making the marketplace public.

- [ ] The API responds at `/api/health`.
- [ ] The API responds at `/api/ready` and can connect to the database.
- [ ] A seller profile can be saved.
- [ ] An allowed test document can be uploaded (JPEG, PNG, or PDF).
- [ ] The interface reports a successful upload and the document information remains after reloading the page.
- [ ] The application appears in the operator identity-verification list.
- [ ] The operator can view the actual uploaded document.
- [ ] Approve, return, and reject actions update the application status.
- [ ] A logged-out user or a different seller cannot retrieve another seller's document.
- [ ] Existing video upload, playback, purchase, and buyer-permission checks continue to work.
- [ ] Backup and retention policies are configured for both PostgreSQL and object storage.

Identity-verification documents contain personal information. Use test files rather than real third-party identity documents during testing. Remove test documents and test accounts when they are no longer needed.

## 6. Troubleshooting

| Error or symptom | What to check |
|---|---|
| `media_storage_local_forbidden_in_production` | Set `MEDIA_STORAGE_PROVIDER=s3` in production. Do not bypass the local-storage safety restriction. |
| `media_s3_configuration_missing:...` | Add each listed environment variable to the backend API service. |
| `media_s3_bucket_missing`, `media_s3_region_missing`, `media_s3_access_key_missing`, or `media_s3_secret_key_missing` | Check the bucket name, region, access key ID, and secret access key. |
| `media_storage_put_failed:...` | Check the bucket, region, endpoint, access permissions, and the storage provider's error details. |
| `media_storage_get_failed:...` | Confirm that the application is reading from the same bucket and object key used for storage, and that read permissions are granted. |
| `verification_document_required` | Select a document, complete the upload successfully, and then submit the verification application. |
| The operator page says “No document” | Check the upload API result, the database document record, the object in storage, and the authenticated operator document-retrieval API in that order. |

Do not paste secret keys, passwords, or actual identity documents into logs or support messages. When investigating an error, provide the error code, approximate time, deployed release, and logs with secrets removed.

## 7. Important operational notes

- Complete the pre-launch checklist after configuring the hosting, storage, and payment services. Make the marketplace public only after the required checks pass.
- Adapt legal requirements for identity verification, personal-data handling, retention periods, deletion requests, terms of service, and the privacy policy to the jurisdictions and business model in which you operate.
- Production payment processing requires the payment provider's live credentials and correctly configured and verified webhooks.
- A database backup alone cannot restore videos or identity-verification documents. Prepare separate backup, retention, and recovery procedures for object storage.

Related files: `README.md`, `DEPLOYMENT.md`, `BACKUP.md`, `COMMERCIAL_PACKAGE.md`, and `backend/.env.example`.
