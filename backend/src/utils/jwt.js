
import { SignJWT, jwtVerify } from "jose";

export const ACCESS_TOKEN_TTL_SECONDS = 900;

const issuer = "api-monitor";
const audience = "api-monitor-web";

const secretValue = process.env.JWT_SECRET;

if (!secretValue || !/^[a-f0-9]{64}$/i.test(secretValue)) {
  throw new Error("JWT_SECRET must be a 32-byte hex secret");
}

const secret = new Uint8Array(Buffer.from(secretValue, "hex"));

export async function signAccessToken(userId) {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
    .sign(secret);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer,
    audience,
  });

  return payload;
}

