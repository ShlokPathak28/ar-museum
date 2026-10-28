/**
 * The rules for changing someone else's account, kept pure so they can be
 * tested without a database or a session.
 *
 * Two lockout mistakes are worth preventing in code rather than in a warning:
 * an admin removing their own access, and the museum ending up with no admin at
 * all. The Server Action re-reads the target and the admin count inside a
 * transaction; the page uses the same functions to decide which buttons to
 * render.
 */

export const USER_ROLES = ["ADMIN", "VISITOR"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type GuardResult = { ok: true } | { ok: false; error: string };

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

type Target = {
  /** The signed-in admin making the change. */
  actorId: string;
  /** The account being changed. */
  targetId: string;
  targetRole: string;
  /** How many ADMIN accounts exist right now, including the target. */
  adminCount: number;
};

export function checkRoleChange(input: Target & { nextRole: string }): GuardResult {
  if (!isUserRole(input.nextRole)) {
    return { ok: false, error: "Unknown role." };
  }

  if (input.targetId === input.actorId) {
    return {
      ok: false,
      error: "You cannot change your own role. Ask another admin to do it.",
    };
  }

  if (
    input.targetRole === "ADMIN" &&
    input.nextRole === "VISITOR" &&
    input.adminCount <= 1
  ) {
    return { ok: false, error: "The museum needs at least one admin." };
  }

  return { ok: true };
}

export function checkUserDeletion(input: Target): GuardResult {
  if (input.targetId === input.actorId) {
    return { ok: false, error: "You cannot delete your own account." };
  }

  if (input.targetRole === "ADMIN" && input.adminCount <= 1) {
    return { ok: false, error: "The museum needs at least one admin." };
  }

  return { ok: true };
}
