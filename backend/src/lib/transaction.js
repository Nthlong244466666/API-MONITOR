
import { prisma } from "./prisma.js";
import { HttpError } from "../utils/HttpError.js";

const MAX_RETRIES = 3;
const RETRYABLE_CODES = new Set(["P2034", "40001", "40P01"]);

function isRetryableTransactionError(error) {
  return [
    error?.code,
    error?.meta?.code,
    error?.meta?.sqlState,
    error?.cause?.code,
    error?.cause?.sqlState,
  ].some((code) => RETRYABLE_CODES.has(code));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withSerializableTransaction(callback) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: "Serializable",
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error) {
      if (!isRetryableTransactionError(error)) {
        throw error;
      }

      if (attempt === MAX_RETRIES) {
        throw new HttpError(
          409,
          "TRANSACTION_CONFLICT",
          "Concurrent operation detected. Please retry."
        );
      }

      const waitMs = 20 * attempt + Math.random() * 30;
      await delay(waitMs);
    }
  }

  throw new HttpError(
    409,
    "TRANSACTION_CONFLICT",
    "Transaction retry limit reached."
  );
}
