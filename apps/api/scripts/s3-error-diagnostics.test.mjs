import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractSafeS3Diagnostic,
  userFacingS3PutMessage,
} from '../src/infrastructure/storage/s3-error-diagnostics.ts';

test('extractSafeS3Diagnostic reads AWS SDK v3 metadata', () => {
  const diag = extractSafeS3Diagnostic(
    {
      name: 'AccessDenied',
      Code: 'AccessDenied',
      message: 'Access Denied',
      $metadata: {
        httpStatusCode: 403,
        requestId: 'REQ123',
        extendedRequestId: 'EXT456',
      },
    },
    { bucket: 'prod-bucket', configuredRegion: 'ap-south-1' },
  );
  assert.equal(diag.awsErrorName, 'AccessDenied');
  assert.equal(diag.awsErrorCode, 'AccessDenied');
  assert.equal(diag.httpStatus, 403);
  assert.equal(diag.requestId, 'REQ123');
  assert.equal(diag.bucket, 'prod-bucket');
  assert.equal(diag.configuredRegion, 'ap-south-1');
});

test('userFacingS3PutMessage maps common S3 failures', () => {
  assert.match(
    userFacingS3PutMessage({
      awsErrorName: 'NoSuchBucket',
      awsErrorCode: 'NoSuchBucket',
      httpStatus: 404,
      requestId: null,
      extendedRequestId: null,
      bucket: 'missing',
      configuredRegion: 'ap-south-1',
      hint: null,
    }),
    /AWS_S3_BUCKET/,
  );
  assert.match(
    userFacingS3PutMessage({
      awsErrorName: 'InvalidAccessKeyId',
      awsErrorCode: 'InvalidAccessKeyId',
      httpStatus: 403,
      requestId: null,
      extendedRequestId: null,
      bucket: 'b',
      configuredRegion: 'eu-west-1',
      hint: null,
    }),
    /AWS_ACCESS_KEY_ID/,
  );
});