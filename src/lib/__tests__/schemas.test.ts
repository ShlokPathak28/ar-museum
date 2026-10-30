import { describe, expect, it } from "vitest";

import { exhibitAdminSchema, reviewSchema, roomAdminSchema } from "@/lib/schemas";

/**
 * These schemas are the contract between a form and a Server Action. The
 * browser runs them for a friendly message; the action runs them again because
 * the browser can be bypassed. A widening on either side is a bug.
 */

const validExhibit = {
  slug: "bidri-hookah-base",
  code: "BH02",
  title: "Bidri Hookah Base",
  subtitle: "",
  era: "Deccan, 17th century",
  yearStart: "1650",
  yearEnd: "",
  roomId: "room_1",
  summary: "A zinc alloy base inlaid with silver, made for a courtly evening.",
  body: "The base was cast in Bidar, where zinc was worked before anywhere else in India, and inlaid with silver sheet.",
  facts: "Cast in Bidar\nInlaid with silver\n\n",
  tags: "metal, bidri",
  heroImage: "/images/exhibits/bidri-hookah-base.jpg",
  modelUrl: "",
  modelUsdz: "",
  status: "DRAFT",
} as const;

describe("reviewSchema", () => {
  it("accepts a whole-star rating with a trimmed body", () => {
    const result = reviewSchema.safeParse({ rating: 4, body: "  A quiet, careful object.  " });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBe("A quiet, careful object.");
  });

  it.each([0, 6, 3.5, Number.NaN])("rejects the rating %s", (rating) => {
    expect(reviewSchema.safeParse({ rating, body: "Long enough to count." }).success).toBe(false);
  });

  it("rejects a body under 12 characters after trimming", () => {
    const result = reviewSchema.safeParse({ rating: 5, body: "   too short   " });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Write at least 12 characters.");
    }
  });

  it("rejects a body over 1200 characters", () => {
    expect(reviewSchema.safeParse({ rating: 5, body: "x".repeat(1201) }).success).toBe(false);
  });
});

describe("exhibitAdminSchema", () => {
  it("accepts a fully formed exhibit", () => {
    expect(exhibitAdminSchema.safeParse(validExhibit).success).toBe(true);
  });

  it.each([
    "Bidri-Hookah",
    "bidri--hookah",
    "-bidri",
    "bidri-",
    "bidri hookah",
    "ab",
    "bidri_hookah",
  ])("rejects the slug %s", (slug) => {
    expect(exhibitAdminSchema.safeParse({ ...validExhibit, slug }).success).toBe(false);
  });

  it.each(["BH02", "ab12", "123456789012"])("accepts the code %s", (code) => {
    expect(exhibitAdminSchema.safeParse({ ...validExhibit, code }).success).toBe(true);
  });

  it.each(["BH0", "BH-02", "1234567890123", "BH 02"])("rejects the code %s", (code) => {
    expect(exhibitAdminSchema.safeParse({ ...validExhibit, code }).success).toBe(false);
  });

  it.each(["", "1850", "-200", "27"])("accepts the year %s", (yearStart) => {
    expect(exhibitAdminSchema.safeParse({ ...validExhibit, yearStart }).success).toBe(true);
  });

  it.each(["12a", "12345", "1.850", "--2"])("rejects the year %s", (yearStart) => {
    expect(exhibitAdminSchema.safeParse({ ...validExhibit, yearStart }).success).toBe(false);
  });

  it("counts only non-blank fact lines toward the limit of eight", () => {
    const eight = Array.from({ length: 8 }, (_, index) => `Fact ${index + 1}`).join("\r\n");
    expect(exhibitAdminSchema.safeParse({ ...validExhibit, facts: eight }).success).toBe(true);

    const nine = Array.from({ length: 9 }, (_, index) => `Fact ${index + 1}`).join("\n");
    expect(exhibitAdminSchema.safeParse({ ...validExhibit, facts: nine }).success).toBe(false);
  });

  it("keeps a short summary and a short body out", () => {
    const result = exhibitAdminSchema.safeParse({
      ...validExhibit,
      summary: "Too short.",
      body: "Also too short.",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain("summary");
      expect(fields).toContain("body");
    }
  });

  it("requires an image and a room", () => {
    const result = exhibitAdminSchema.safeParse({ ...validExhibit, heroImage: "", roomId: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain("heroImage");
      expect(fields).toContain("roomId");
    }
  });

  it("only accepts the two statuses the museum uses", () => {
    expect(exhibitAdminSchema.safeParse({ ...validExhibit, status: "ARCHIVED" }).success).toBe(false);
  });
});

const validRoom = {
  slug: "textile-room",
  name: "Textile Room",
  floor: "Second floor",
  intro: "Cloth, dye and the hands that worked them.",
  panoramaUrl: "",
  panoramaCredit: "",
} as const;

describe("roomAdminSchema", () => {
  it("accepts a room with no panorama yet", () => {
    expect(roomAdminSchema.safeParse(validRoom).success).toBe(true);
  });

  it("accepts both kinds of panorama path the Studio produces", () => {
    expect(
      roomAdminSchema.safeParse({ ...validRoom, panoramaUrl: "/panoramas/textiles.webp" }).success,
    ).toBe(true);
    expect(
      roomAdminSchema.safeParse({ ...validRoom, panoramaUrl: "/api/panoramas/clx123" }).success,
    ).toBe(true);
  });

  it.each(["https://example.com/pano.jpg", "panoramas/textiles.webp", "//example.com/x.webp"])(
    "rejects the panorama source %s",
    (panoramaUrl) => {
      const result = roomAdminSchema.safeParse({ ...validRoom, panoramaUrl });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("upload a panorama");
      }
    },
  );

  it("applies the same slug rules as an exhibit", () => {
    expect(roomAdminSchema.safeParse({ ...validRoom, slug: "Textile-Room" }).success).toBe(false);
    expect(roomAdminSchema.safeParse({ ...validRoom, slug: "ab" }).success).toBe(false);
    expect(roomAdminSchema.safeParse({ ...validRoom, slug: "textile_room" }).success).toBe(false);
  });

  it("requires a name and a floor", () => {
    const result = roomAdminSchema.safeParse({ ...validRoom, name: " ", floor: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain("name");
      expect(fields).toContain("floor");
    }
  });

  it("keeps the introduction and the credit inside their limits", () => {
    expect(roomAdminSchema.safeParse({ ...validRoom, intro: "x".repeat(401) }).success).toBe(false);
    expect(
      roomAdminSchema.safeParse({ ...validRoom, panoramaCredit: "x".repeat(201) }).success,
    ).toBe(false);
  });
});
