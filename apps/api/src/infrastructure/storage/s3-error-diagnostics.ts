/**
 * Safe AWS S3 error shaping for logs and user-facing messages (no secrets).
 */

export type SafeS3Diagnostic = {
  readonly awsErrorName: string;
  readonly awsErrorCode: string | null;
  readonly httpStatus: number | null;
  readonly requestId: string | null;
  readonly extendedRequestId: string | null;
  readonly bucket: string | null;
  readonly configuredRegion: string | null;
  readonly hint: string | null;
};

type AwsLikeError = {
  readonly name?: string;
  readonly message?: string;
  readonly Code?: string;
  readonly $metadata?: {
    readonly httpStatusCode?: number;
    readonly requestId?: string;
    readonly extendedRequestId?: string;
  };
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function extractSafeS3Diagnostic(
  error: unknown,
  context: { readonly bucket?: string; readonly configuredRegion?: string },
): SafeS3Diagnostic {
  const err = (error ?? {}) as AwsLikeError;
  const awsErrorName = readString(err.name) ?? 'Unknown';
  const awsErrorCode = readString(err.Code) ?? awsErrorName;
  const httpStatus =
    typeof err.$metadata?.httpStatusCode === 'number' ? err.$metadata.httpStatusCode : null;
  const requestId = readString(err.$metadata?.requestId);
  const extendedRequestId = readString(err.$metadata?.extendedRequestId);
  const message = readString(err.message)?.toLowerCase() ?? '';

  let hint: string | null = null;
  if (message.includes('kms') || message.includes('encryption')) {
    hint = 'kms_or_sse';
  } else if (message.includes('must be addressed using the specified endpoint')) {
    hint = 'wrong_endpoint_or_region';
  }

  return {
    awsErrorName,
    awsErrorCode,
    httpStatus,
    requestId,
    extendedRequestId,
    bucket: context.bucket ?? null,
    configuredRegion: context.configuredRegion ?? null,
    hint,
  };
}

/** Maps AWS failure classes to operator-safe client messages (no raw SDK text). */
export function userFacingS3PutMessage(diag: SafeS3Diagnostic): string {
  const regionHint = diag.configuredRegion
    ? `Configured region: ${diag.configuredRegion}.`
    : 'Check AWS_REGION matches the bucket.';

  switch (diag.awsErrorName) {
    case 'AccessDenied':
    case 'AccessDeniedException':
      if (diag.hint === 'kms_or_sse') {
        return (
          'Object storage denied the upload because of bucket encryption (KMS/SSE). ' +
          'Grant the IAM user kms:Encrypt and kms:GenerateDataKey on the bucket key, or s3:PutObject with required encryption headers.'
        );
      }
      return (
        'Object storage denied the upload. Verify IAM allows s3:PutObject on ' +
        'arn:aws:s3:::AWS_S3_BUCKET/org/* and that no bucket policy explicitly denies writes.'
      );
    case 'NoSuchBucket':
      return (
        'The configured object storage bucket was not found. Set AWS_S3_BUCKET to the exact bucket name ' +
        `in the API service on Coolify. ${regionHint}`
      );
    case 'InvalidAccessKeyId':
      return (
        'Object storage rejected the AWS access key. Set AWS_ACCESS_KEY_ID on the API service in Coolify ' +
        'to a valid IAM key (not expired or deactivated).'
      );
    case 'SignatureDoesNotMatch':
      return (
        'Object storage rejected the AWS secret key. Verify AWS_SECRET_ACCESS_KEY on the API service ' +
        'has no extra spaces or line breaks, then redeploy the API container.'
      );
    case 'PermanentRedirect':
    case 'AuthorizationHeaderMalformed':
    case 'IllegalLocationConstraintException':
      return (
        'Object storage region does not match the bucket. ' +
        `${regionHint} In the S3 console, confirm the bucket region and update AWS_REGION on the API service.`
      );
    case 'NetworkingError':
    case 'TimeoutError':
      return (
        'The API could not reach object storage (network or timeout). Confirm the container has outbound ' +
        'internet access to AWS S3 from Coolify.'
      );
    case 'CredentialsProviderError':
    case 'UnrecognizedClientException':
      return (
        'Object storage credentials are missing or invalid. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY ' +
        'on the API service when STORAGE_PROVIDER=s3.'
      );
    default:
      return (
        'Could not save the file to object storage. Check STORAGE_PROVIDER=s3, AWS_S3_BUCKET, AWS_REGION, ' +
        'and IAM s3:PutObject on org/* in the API Coolify service.'
      );
  }
}

export function safeS3LogFields(diag: SafeS3Diagnostic): Record<string, string | number | null> {
  return {
    awsErrorName: diag.awsErrorName,
    awsErrorCode: diag.awsErrorCode,
    httpStatus: diag.httpStatus,
    requestId: diag.requestId,
    extendedRequestId: diag.extendedRequestId,
    bucket: diag.bucket,
    configuredRegion: diag.configuredRegion,
    hint: diag.hint,
  };
}