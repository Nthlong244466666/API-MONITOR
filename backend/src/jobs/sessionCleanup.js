
import { prisma } from "../lib/prisma.js";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function cleanupAuthSessions() {
  const now = new Date();
  const revokedCutoff = new Date(
    Date.now() - SEVEN_DAYS_MS
  );

  const result = await prisma.authSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { absoluteExpiresAt: { lt: now } },
        { revokedAt: { lt: revokedCutoff } },
      ],
    },
  });

  if (result.count > 0) {
    console.log(
      `[Session Cleanup] Removed ${result.count} sessions`
    );
  }
}

export function startSessionCleanup() {
  async function run() {
    try {
      await cleanupAuthSessions();
    } catch (error) {
      console.error("[Session Cleanup]", error);
    }
  }

  void run();

  const timer = setInterval(run, SIX_HOURS_MS);
  timer.unref();

  return () => clearInterval(timer);
}
