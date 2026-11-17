# File storage (S3)

Central uploads are persisted as `stored_objects` rows and served only through authorized API routes (`/api/v1/media/objects/:id/content`). Objects are private in S3; the API returns short-lived presigned URLs after permission checks.

## Environment variables

Set in Coolify (or `.env` locally). Never commit secrets.

| Variable | Description |
| --- | --- |
| `STORAGE_PROVIDER` | `local` (default in development) or `s3` (default in production). |
| `AWS_ACCESS_KEY_ID` | IAM access key. Required when `STORAGE_PROVIDER=s3`. |
| `AWS_SECRET_ACCESS_KEY` | IAM secret. Required when `STORAGE_PROVIDER=s3`. |
| `AWS_REGION` | e.g. `ap-south-1` |
| `AWS_S3_BUCKET` | e.g. `techwin-s3` |
| `STORAGE_PRESIGNED_TTL_SECONDS` | Presigned download lifetime (default 900). |
| `STORAGE_EMPLOYEE_PROFILE_MAX_BYTES` | Profile image limit (default 5 MB). |
| `MEDIA_CLEANUP_WORKER_ENABLED` | When `true` (default), the API runs a background worker that drains `storage_cleanup_jobs`. Set `false` on extra replicas. |
| `MEDIA_CLEANUP_INTERVAL_MS` | Tick interval in ms (default 60000). |
| `MEDIA_CLEANUP_BATCH_SIZE` | Jobs processed per tick (default 20). |

## IAM (least privilege)

The bucket env var is **`AWS_S3_BUCKET`** (there is no `S3_BUCKET_NAME` in this codebase).

Object keys are prefixed with `org/{organizationId}/…`. Grant the application IAM user only:

- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:HeadObject` on `arn:aws:s3:::YOUR_BUCKET/org/*`
- If the bucket uses SSE-KMS default encryption, also `kms:Decrypt`, `kms:Encrypt`, and `kms:GenerateDataKey` on that CMK (or use a bucket default that does not require KMS for this app user).

Example policy (replace `YOUR_BUCKET`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:HeadObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET/org/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET",
      "Condition": { "StringLike": { "s3:prefix": ["org/*"] } }
    }
  ]
}
```

`ListBucket` is optional (uploads do not require it); include only if you use operational tooling against the prefix.

Block public ACLs and bucket policies that expose objects anonymously.

## Production troubleshooting

When an upload fails, API logs include `storage.upload.put_object_failed` with **non-secret** fields: `awsErrorName`, `awsErrorCode`, `httpStatus`, `requestId`, `bucket`, `configuredRegion`. The browser receives a mapped message (never raw AWS text).

Common fixes on **Coolify → API service** (not the Web service):

| Log `awsErrorName` | Typical fix |
| --- | --- |
| `AccessDenied` | IAM `s3:PutObject` on `org/*`; check bucket policy denies; KMS key policy if bucket is SSE-KMS. |
| `NoSuchBucket` | Set `AWS_S3_BUCKET` to the real bucket name (defaults to `techwin-s3` if unset). |
| `InvalidAccessKeyId` / `SignatureDoesNotMatch` | Rotate or re-enter `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (no trailing spaces). |
| `PermanentRedirect` | Set `AWS_REGION` to the bucket’s region in the S3 console. |

Redeploy the API container after changing env vars.

## Local development

With `STORAGE_PROVIDER=local` (default when `NODE_ENV=development`), files are written under `apps/api/data/uploads/objects/`. This path is gitignored.

## Failed cleanup

If S3 delete fails after a DB unlink, a row is inserted into `storage_cleanup_jobs`. The API **`StoredObjectCleanupJobRunner`** processes that queue on a timer (see `MEDIA_CLEANUP_*` env vars). It uses the same Redis exclusive-lock pattern as the WhatsApp worker: only one replica runs a tick at a time; others skip until the lock is free. When Redis is down, a replica may still run cleanup (best-effort, same as WhatsApp).

Each job stays `PENDING` until the object delete succeeds or **`failCleanupJob`** marks it `FAILED` after **five** attempts. Failures log the error category without object secrets. Disable the worker on secondary API instances with `MEDIA_CLEANUP_WORKER_ENABLED=false` in Coolify.

## Credential rotation

1. Create a new IAM access key.
2. Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Coolify.
3. Redeploy the API.
4. Deactivate the old key after traffic is healthy.

## Testing uploads

1. Sign in to the admin app with `media.upload` and `employees.create`.
2. Add or edit an employee and upload a JPEG/PNG/WebP under 5 MB.
3. Confirm the list avatar loads via `/api/v1/media/objects/{id}/content`.
