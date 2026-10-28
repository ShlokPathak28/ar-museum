import { describe, expect, it } from "vitest";

import { checkRoleChange, checkUserDeletion, isUserRole } from "@/lib/user-admin";

const base = {
  actorId: "admin-1",
  targetId: "user-1",
  targetRole: "VISITOR",
  adminCount: 2,
};

describe("isUserRole", () => {
  it("accepts the two roles the schema documents", () => {
    expect(isUserRole("ADMIN")).toBe(true);
    expect(isUserRole("VISITOR")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isUserRole("admin")).toBe(false);
    expect(isUserRole("OWNER")).toBe(false);
    expect(isUserRole("")).toBe(false);
  });
});

describe("checkRoleChange", () => {
  it("lets an admin promote a visitor", () => {
    expect(checkRoleChange({ ...base, nextRole: "ADMIN" })).toEqual({ ok: true });
  });

  it("lets an admin demote another admin while one remains", () => {
    expect(
      checkRoleChange({
        ...base,
        targetRole: "ADMIN",
        adminCount: 2,
        nextRole: "VISITOR",
      }),
    ).toEqual({ ok: true });
  });

  it("refuses to demote the last admin", () => {
    expect(
      checkRoleChange({
        ...base,
        targetRole: "ADMIN",
        adminCount: 1,
        nextRole: "VISITOR",
      }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("at least one admin") });
  });

  it("refuses to change your own role, even when another admin exists", () => {
    expect(
      checkRoleChange({
        ...base,
        targetId: base.actorId,
        nextRole: "VISITOR",
      }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("your own role") });
  });

  it("rejects an unknown role before looking at anything else", () => {
    expect(checkRoleChange({ ...base, nextRole: "OWNER" })).toMatchObject({
      ok: false,
      error: "Unknown role.",
    });
  });
});

describe("checkUserDeletion", () => {
  it("lets an admin delete a visitor", () => {
    expect(checkUserDeletion(base)).toEqual({ ok: true });
  });

  it("lets an admin delete another admin while one remains", () => {
    expect(
      checkUserDeletion({ ...base, targetRole: "ADMIN", adminCount: 2 }),
    ).toEqual({ ok: true });
  });

  it("refuses to delete the last admin", () => {
    expect(
      checkUserDeletion({ ...base, targetRole: "ADMIN", adminCount: 1 }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("at least one admin") });
  });

  it("refuses to delete your own account", () => {
    expect(checkUserDeletion({ ...base, targetId: base.actorId })).toMatchObject({
      ok: false,
      error: expect.stringContaining("your own account"),
    });
  });
});
