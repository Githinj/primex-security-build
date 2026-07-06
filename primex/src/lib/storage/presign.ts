import 'server-only'
import crypto from 'crypto'

// Presigns S3-compatible GET URLs for DigitalOcean Spaces (AWS Signature V4).
// Hand-rolled to avoid pulling in the AWS SDK. When credentials aren't set the
// original URL is returned unchanged, so a public bucket keeps working (the
// signing only matters once the recordings bucket is made private).

const REGION = process.env.DO_SPACES_REGION || 'sgp1'
const ACCESS_KEY = process.env.DO_SPACES_KEY
const SECRET_KEY = process.env.DO_SPACES_SECRET

export function isRecordingSigningConfigured(): boolean {
  return Boolean(ACCESS_KEY && SECRET_KEY)
}

function hmac(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

// RFC 3986 encoding (encodeURIComponent leaves ! ' ( ) * unescaped).
export function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  )
}

// Encode an object key, preserving "/" between path segments.
export function encodeKeyPath(key: string): string {
  return key.split('/').map(encodeRfc3986).join('/')
}

/**
 * Return a short-lived presigned GET URL for a recording stored at `fileUrl`
 * (a virtual-hosted DO Spaces URL like https://bucket.sgp1.digitaloceanspaces.com/recordings/x.mp4).
 * Falls back to `fileUrl` verbatim when signing isn't configured or the URL
 * can't be parsed.
 */
export function signedPlaybackUrl(fileUrl: string, expiresInSeconds = 3600): string {
  if (!ACCESS_KEY || !SECRET_KEY || !fileUrl) return fileUrl

  let parsed: URL
  try {
    parsed = new URL(fileUrl)
  } catch {
    return fileUrl
  }

  const host = parsed.host
  const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!key) return fileUrl

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '') // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8)
  const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`

  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${ACCESS_KEY}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  }

  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(params[k])}`)
    .join('&')

  const canonicalUri = '/' + encodeKeyPath(key)
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = hmac('AWS4' + SECRET_KEY, dateStamp)
  const kRegion = hmac(kDate, REGION)
  const kService = hmac(kRegion, 's3')
  const kSigning = hmac(kService, 'aws4_request')
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex')

  return `${parsed.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}
