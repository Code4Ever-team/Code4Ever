import { S3Client } from "@aws-sdk/client-s3";

const globalForS3 = globalThis as unknown as { s3Client?: S3Client };

const DEFAULT_REGION = "eu-central-1";

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

/** Supabase: anon JWT → access key, service_role JWT → secret key. */
export function resolveS3Credentials(): {
  accessKeyId: string;
  secretAccessKey: string;
} | null {
  const accessKeyId =
    trim(process.env.AWS_ACCESS_KEY_ID) ??
    trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const secretAccessKey =
    trim(process.env.AWS_SECRET_ACCESS_KEY) ??
    trim(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey };
}

export function isS3Configured(): boolean {
  return Boolean(
    resolveS3Credentials() &&
      trim(process.env.AWS_S3_BUCKET) &&
      trim(process.env.AWS_S3_ENDPOINT)
  );
}

export function getS3Region(): string {
  return trim(process.env.AWS_REGION) ?? DEFAULT_REGION;
}

export function getS3Bucket(): string {
  const bucket = trim(process.env.AWS_S3_BUCKET);
  if (!bucket) throw new Error("AWS_S3_BUCKET_MISSING");
  return bucket;
}

export function getS3Endpoint(): string {
  const endpoint = trim(process.env.AWS_S3_ENDPOINT);
  if (!endpoint) throw new Error("AWS_S3_ENDPOINT_MISSING");
  return endpoint;
}

function supabaseProjectRef(): string | null {
  const fromEndpoint = getS3Endpoint().match(/https:\/\/([^.]+)\.storage\.supabase\.co/);
  if (fromEndpoint?.[1]) return fromEndpoint[1];

  const base = trim(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const fromUrl = base?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return fromUrl?.[1] ?? null;
}

/** Supabase public object URL — tarayıcıda 404 almamak için. */
export function buildS3PublicUrl(objectKey: string): string {
  const custom = trim(process.env.AWS_S3_PUBLIC_BASE_URL)?.replace(/\/$/, "");
  if (custom) return `${custom}/${objectKey}`;

  const ref = supabaseProjectRef();
  if (ref) {
    return `https://${ref}.supabase.co/storage/v1/object/public/${getS3Bucket()}/${objectKey}`;
  }

  const bucket = getS3Bucket();
  const region = getS3Region();
  const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

/** Cold start maliyetini düşürmek için global singleton. */
export function getS3Client(): S3Client {
  const credentials = resolveS3Credentials();
  if (!credentials) throw new Error("S3_NOT_CONFIGURED");

  if (!globalForS3.s3Client) {
    globalForS3.s3Client = new S3Client({
      region: getS3Region(),
      endpoint: getS3Endpoint(),
      forcePathStyle: true,
      credentials,
      maxAttempts: 2,
    });
  }

  return globalForS3.s3Client;
}

export function isInvalidAccessKeyError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("InvalidAccessKeyId") || msg.includes("SignatureDoesNotMatch");
}
