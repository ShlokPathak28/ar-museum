"use server";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidateMuseum } from "@/lib/revalidate";
import {
  checkRoleChange,
  checkUserDeletion,
  isUserRole,
  type UserRole,
} from "@/lib/user-admin";

export type UserMutationResult = { ok: true } | { ok: false; error: string };

/**
 * Promote or demote an account from `/studio/users`.
 *
 * The layout's guard is UX; this action re-reads the session because it is a
 * public endpoint. The target and the admin count are read inside the same
 * transaction as the update, so two admins demoting each other at once cannot
 * both see "there are two" and leave the museum with none.
 */
export async function setUserRole(id: string, nextRole: UserRole): Promise<UserMutationResult> {
  const viewer = await requireAdmin();

  if (typeof id !== "string" || id === "") {
    return { ok: false, error: "That account no longer exists." };
  }

  if (!isUserRole(nextRole)) {
    return { ok: false, error: "Unknown role." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      });

      if (!target) {
        return { ok: false as const, error: "That account no longer exists." };
      }

      const adminCount = await tx.user.count({ where: { role: "ADMIN" } });

      const check = checkRoleChange({
        actorId: viewer.user.id,
        targetId: target.id,
        targetRole: target.role,
        adminCount,
        nextRole,
      });

      if (!check.ok) return check;

      await tx.user.update({ where: { id }, data: { role: nextRole } });
      return { ok: true as const };
    });

    return result;
  } catch {
    return { ok: false, error: "That account could not be updated. Try again." };
  }
}

/**
 * Delete an account for good.
 *
 * Sessions, accounts and reviews cascade; scans and stamps keep their history
 * with `userId` set to NULL, so the museum's visitor numbers do not drop when a
 * person leaves. The public pages are revalidated because a deleted reviewer
 * disappears from an exhibit.
 */
export async function deleteUserAsAdmin(id: string): Promise<UserMutationResult> {
  const viewer = await requireAdmin();

  if (typeof id !== "string" || id === "") {
    return { ok: false, error: "That account no longer exists." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      });

      if (!target) {
        return { ok: false as const, error: "That account no longer exists." };
      }

      const adminCount = await tx.user.count({ where: { role: "ADMIN" } });

      const check = checkUserDeletion({
        actorId: viewer.user.id,
        targetId: target.id,
        targetRole: target.role,
        adminCount,
      });

      if (!check.ok) return check;

      await tx.user.delete({ where: { id } });
      return { ok: true as const };
    });

    if (!result.ok) return result;

    revalidateMuseum();
    return { ok: true };
  } catch {
    return { ok: false, error: "That account could not be deleted. Try again." };
  }
}
