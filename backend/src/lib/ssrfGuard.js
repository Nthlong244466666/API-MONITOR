import { lookup as systemLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class UnsafeTargetError extends Error {
  constructor(message = 'Target is not permitted by the outbound security policy') {
    super(message);
    this.name = 'UnsafeTargetError';
    this.code = 'UNSAFE_TARGET';
  }
}

const BLOCKED_V4 = [
  ['0.0.0.0',8], ['10.0.0.0',8], ['100.64.0.0',10],
  ['127.0.0.0',8], ['169.254.0.0',16], ['172.16.0.0',12],
  ['192.0.0.0',24], ['192.0.2.0',24], ['192.88.99.0',24],
  ['192.168.0.0',16], ['198.18.0.0',15], ['198.51.100.0',24],
  ['203.0.113.0',24], ['224.0.0.0',4], ['240.0.0.0',4],
];

function ipv4BigInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || +p > 255)) return null;
  return parts.reduce((n, p) => (n << 8n) | BigInt(+p), 0n);
}

function ipv6BigInt(ip) {
  // Never allow mapped IPv4, 6to4, NAT64 or dotted IPv4 forms.
  if (ip.includes('.') || ip.includes('%')) return null;
  const halves = ip.toLowerCase().split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if (left.concat(right).some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const count = left.length + right.length;
  if (halves.length === 1 && count !== 8) return null;
  if (halves.length === 2 && count >= 8) return null;
  const parts = halves.length === 2
    ? [...left, ...Array(8 - count).fill('0'), ...right]
    : left;
  return parts.reduce((n, p) => (n << 16n) | BigInt(parseInt(p, 16)), 0n);
}

function inCidr(value, network, bits, width) {
  const shift = BigInt(width - bits);
  return (value >> shift) === (network >> shift);
}

export function isPublicIp(address) {
  const ip = address.replace(/^\[|\]$/g, '');
  const family = isIP(ip);
  if (family === 4) {
    const value = ipv4BigInt(ip);
    if (value === null) return false;
    return !BLOCKED_V4.some(([network, bits]) => inCidr(value, ipv4BigInt(network), bits, 32));
  }
  if (family === 6) {
    const value = ipv6BigInt(ip);
    if (value === null) return false;
    // Conservative public IPv6 policy; deny transition, special and documentation ranges.
    const global2000 = inCidr(value, 0x2000n << 112n, 3, 128);
    if (!global2000) return false;
    const deny = [
      [0x20010000000000000000000000000000n, 23], // protocol assignments
      [0x20010db8000000000000000000000000n, 32], // documentation
      [0x20020000000000000000000000000000n, 16], // 6to4
      [0x3fff0000000000000000000000000000n, 20], // documentation
    ];
    return !deny.some(([network, bits]) => inCidr(value, network, bits, 128));
  }
  return false;
}

function hostnameAllowed(hostname) {
  if (isIP(hostname)) return true; // IP policy is enforced separately.
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host.length > 253 || !host.includes('.')) return false;
  if (/(^|\.)(localhost|local|internal|test|invalid|onion|home|lan)$/.test(host)) return false;
  if (host.endsWith('.home.arpa') || host.endsWith('.localhost')) return false;
  return host.split('.').every((label) =>
    label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  );
}

export function validateTargetUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length > 2048) throw new UnsafeTargetError();
  let url;
  try { url = new URL(rawUrl); } catch { throw new UnsafeTargetError('Invalid HTTP URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new UnsafeTargetError('Only HTTP(S) URLs without embedded credentials are allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostnameAllowed(host)) throw new UnsafeTargetError();
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  if (![80, 443].includes(port)) throw new UnsafeTargetError('Only outbound ports 80 and 443 are enabled');
  if (isIP(host) && !isPublicIp(host)) throw new UnsafeTargetError();
  return url;
}

export async function resolvePublicAddress(hostname, resolver = systemLookup) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (!isPublicIp(host)) throw new UnsafeTargetError();
    return { address: host, family: isIP(host) };
  }
  let addresses;
  try { addresses = await resolver(host, { all: true, order: 'verbatim' }); }
  catch (error) { throw Object.assign(new Error('DNS resolution failed'), { code: 'DNS_ERROR', cause: error }); }
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new UnsafeTargetError('DNS response contains non-public or invalid IP addresses');
  }
  return addresses[0];
}
