import { describe, it, expect } from 'vitest'
import {
  categorizeIp,
  checkSourceAddress,
  ipMatchesCidr,
  isIpLiteral,
  parseSourceUrl,
} from './source-url'

describe('categorizeIp', () => {
  it('flags the cloud metadata endpoint as link-local', () => {
    // The prize in this whole issue: 169.254.169.254 hands out instance
    // credentials to anything on the droplet that asks.
    expect(categorizeIp('169.254.169.254')).toBe('link-local')
  })

  it.each([
    ['127.0.0.1', 'loopback'],
    ['127.255.255.254', 'loopback'],
    ['0.0.0.0', 'unspecified'],
    ['224.0.0.1', 'multicast'],
    ['239.255.255.250', 'multicast'],
    ['10.0.0.5', 'private'],
    ['172.16.0.1', 'private'],
    ['172.31.255.255', 'private'],
    ['192.168.1.64', 'private'],
    ['100.64.0.1', 'private'],
    ['203.0.113.7', 'public'],
    ['8.8.8.8', 'public'],
  ])('classifies %s as %s', (ip, expected) => {
    expect(categorizeIp(ip)).toBe(expected)
  })

  it.each([
    ['172.15.0.1', 'public'],
    ['172.32.0.1', 'public'],
    ['100.128.0.1', 'public'],
    ['192.169.0.1', 'public'],
  ])('does not over-claim %s as private', (ip, expected) => {
    // The RFC1918 boundaries are easy to widen by accident, and every address
    // wrongly called private is one an allowlist then has to enumerate.
    expect(categorizeIp(ip)).toBe(expected)
  })

  it.each([
    ['::1', 'loopback'],
    ['::', 'unspecified'],
    ['fe80::1', 'link-local'],
    ['ff02::1', 'multicast'],
    ['fd00::1', 'private'],
    ['fc00::1', 'private'],
    ['2001:4860:4860::8888', 'public'],
  ])('classifies the IPv6 address %s as %s', (ip, expected) => {
    expect(categorizeIp(ip)).toBe(expected)
  })

  it('classifies an IPv4-mapped IPv6 address by its embedded address', () => {
    // ::ffff:169.254.169.254 reaches metadata exactly like the bare form does.
    expect(categorizeIp('::ffff:169.254.169.254')).toBe('link-local')
    expect(categorizeIp('::ffff:203.0.113.7')).toBe('public')
  })

  it('strips brackets off a URL-form IPv6 host', () => {
    expect(categorizeIp('[::1]')).toBe('loopback')
  })
})

describe('checkSourceAddress', () => {
  it.each([
    ['169.254.169.254', 'link-local'],
    ['127.0.0.1', 'loopback'],
    ['0.0.0.0', 'unspecified'],
    ['239.0.0.1', 'multicast'],
    ['::1', 'loopback'],
  ])('always refuses %s', (ip, category) => {
    const verdict = checkSourceAddress(ip)
    expect(verdict.allowed).toBe(false)
    expect(verdict.allowed === false && verdict.category).toBe(category)
  })

  it('allows a private address when no allowlist is configured', () => {
    // Site cameras are pulled over a tunnel, so 192.168/10.x IS the normal
    // target. Blocking RFC1918 outright — as the issue proposed — would take
    // every real customer site offline (SEC-197/199).
    expect(checkSourceAddress('192.168.1.64').allowed).toBe(true)
    expect(checkSourceAddress('100.64.0.9').allowed).toBe(true)
  })

  it('allows a public address regardless of the allowlist', () => {
    // The allowlist exists to constrain reach into private networks; a public
    // camera is reachable from anywhere and gains nothing from being listed.
    expect(checkSourceAddress('203.0.113.7', '10.8.0.0/24').allowed).toBe(true)
  })

  it('confines private targets to the allowlist once one is set', () => {
    expect(checkSourceAddress('10.8.0.5', '10.8.0.0/24').allowed).toBe(true)
    expect(checkSourceAddress('10.9.0.5', '10.8.0.0/24').allowed).toBe(false)
  })

  it('accepts any entry in a multi-CIDR allowlist, ignoring padding', () => {
    expect(checkSourceAddress('192.168.4.2', ' 10.8.0.0/24 , 192.168.4.0/24 ').allowed).toBe(
      true,
    )
  })

  it('still refuses link-local even when an allowlist would cover it', () => {
    // An operator must not be able to allowlist their way to the metadata
    // endpoint by writing 169.254.0.0/16.
    expect(checkSourceAddress('169.254.169.254', '169.254.0.0/16').allowed).toBe(false)
  })

  it('treats an empty allowlist as unset rather than as "deny all"', () => {
    expect(checkSourceAddress('10.0.0.1', '').allowed).toBe(true)
    expect(checkSourceAddress('10.0.0.1', '  ,  ').allowed).toBe(true)
  })
})

describe('ipMatchesCidr', () => {
  it.each([
    ['10.8.0.1', '10.8.0.0/24', true],
    ['10.8.0.255', '10.8.0.0/24', true],
    ['10.8.1.0', '10.8.0.0/24', false],
    ['10.255.255.255', '10.0.0.0/8', true],
    ['11.0.0.1', '10.0.0.0/8', false],
    ['192.168.1.1', '192.168.1.1', true],
    ['192.168.1.2', '192.168.1.1', false],
    ['1.2.3.4', '0.0.0.0/0', true],
  ])('%s in %s → %s', (ip, cidr, expected) => {
    expect(ipMatchesCidr(ip, cidr)).toBe(expected)
  })

  it('handles a /32 without off-by-one', () => {
    expect(ipMatchesCidr('10.0.0.1', '10.0.0.1/32')).toBe(true)
    expect(ipMatchesCidr('10.0.0.2', '10.0.0.1/32')).toBe(false)
  })

  it('does not match a high-bit address by sign error', () => {
    // Bit 31 set — the classic place a signed shift turns into a wrong answer.
    expect(ipMatchesCidr('200.0.0.1', '200.0.0.0/24')).toBe(true)
    expect(ipMatchesCidr('200.0.1.1', '200.0.0.0/24')).toBe(false)
  })

  it.each([
    ['a nonsense prefix', '10.0.0.0/33'],
    ['a negative prefix', '10.0.0.0/-1'],
    ['an empty entry', ''],
  ])('rejects %s rather than matching everything', (_label, cidr) => {
    expect(ipMatchesCidr('10.0.0.1', cidr)).toBe(false)
  })
})

describe('isIpLiteral', () => {
  it.each(['10.0.0.1', '169.254.169.254', '::1', 'fd00::1', '[::1]'])(
    'recognises %s as a literal',
    (host) => {
      expect(isIpLiteral(host)).toBe(true)
    },
  )

  it.each(['camera.example.com', 'localhost', 'cam-01'])(
    'treats %s as a name needing resolution',
    (host) => {
      expect(isIpLiteral(host)).toBe(false)
    },
  )

  it('does not mistake a dotted name for an address', () => {
    expect(isIpLiteral('10.0.0.evil.example.com')).toBe(false)
  })
})

describe('parseSourceUrl', () => {
  it('pulls the hostname out of an rtsp URL with credentials and a port', () => {
    const parsed = parseSourceUrl('rtsp://admin:s3cret@192.168.1.64:554/Streaming/Channels/101')
    expect(parsed.ok && parsed.hostname).toBe('192.168.1.64')
  })

  it('accepts rtsps', () => {
    expect(parseSourceUrl('rtsps://cam.example.com/stream').ok).toBe(true)
  })

  it('unwraps a bracketed IPv6 host', () => {
    const parsed = parseSourceUrl('rtsp://[fd00::1]:554/stream')
    expect(parsed.ok && parsed.hostname).toBe('fd00::1')
  })

  it.each([
    ['http', 'http://192.168.1.64/stream'],
    ['file', 'file:///etc/passwd'],
    ['no scheme', '192.168.1.64/stream'],
  ])('rejects a %s URL', (_label, raw) => {
    expect(parseSourceUrl(raw).ok).toBe(false)
  })

  it('rejects a string that passes the scheme test but is not a URL', () => {
    // The old check was a bare regex on the string, which let this through and
    // then substring-matched a "hostname" out of it later.
    expect(parseSourceUrl('rtsp://').ok).toBe(false)
  })
})
