
import argon2 from "argon2";

import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/HttpError.js";
import { createSession } from "./session.service.js";

const publicUser = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
};

const DUMMY_HASH = await argon2.hash(
  "dummy-password-for-timing-protection",
  { type: argon2.argon2id }
);

export async function registerUser({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new HttpError(
      409,
      "EMAIL_EXISTS",
      "Email already registered"
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  try {
    return await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        workspaces: {
          create: {
            name: `${name}'s Workspace`,
            projects: {
              create: { name: "My Project" },
            },
          },
        },
      },
      select: publicUser,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new HttpError(
        409,
        "EMAIL_EXISTS",
        "Email already registered"
      );
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  const valid = await argon2.verify(
    user?.passwordHash ?? DUMMY_HASH,
    password
  );

  if (!user || !valid) {
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password"
    );
  }

  return createSession(user);
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUser,
  });

  if (!user) {
    throw new HttpError(
      401,
      "UNAUTHORIZED",
      "Account is unavailable"
    );
  }

  return user;
}

