import { S3Client } from "@aws-sdk/client-s3";

const globalForS3 = globalThis as unknown as {
  s3Client?: S3Client;
};

const DEFAULT_REGION = "eu-central-1";

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
  );
}

export function getS3Region(): string {
  return process.env.AWS_REGION ?? DEFAULT_REGION;
}

export function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET_MISSING");
  return bucket;
}

/** Cold start maliyetini düşürmek için global singleton S3Client. */
export function getS3Client(): S3Client {
  if (!isS3Configured()) {
    throw new Error("S3_NOT_CONFIGURED");
  }

  if (!globalForS3.s3Client) {
    globalForS3.s3Client = new S3Client({
      region: getS3Region(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      maxAttempts: 2,
    });
  }

  return globalForS3.s3Client;
}

export function buildS3PublicUrl(objectKey: string): string {
  const base = process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base) return `${base}/${objectKey}`;

  const bucket = getS3Bucket();
  const region = getS3Region();
  const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}
