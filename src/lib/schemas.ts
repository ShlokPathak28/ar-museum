import { z } from "zod";

/**
 * Better Auth's `minPasswordLength`. Shared with the reset form so the browser
 * refuses a short password with the same rule the auth endpoint will apply.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * One review per visitor per exhibit. The same schema validates the form in the
 * browser and the Server Action, so a client can never widen the rules.
 */
export const reviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Choose a rating from 1 to 5.")
    .max(5, "Choose a rating from 1 to 5."),
  body: z
    .string()
    .trim()
    .min(12, "Write at least 12 characters.")
    .max(1200, "Keep the review under 1200 characters."),
});

export type ReviewValues = z.infer<typeof reviewSchema>;

/**
 * The two halves of a password reset. There is no Server Action here: Better
 * Auth owns the endpoints and the token lifecycle, so these schemas only decide
 * whether the browser should send the request at all.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter the email address you signed up with."),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(128, "Keep the password under 128 characters."),
    confirmPassword: z.string().min(1, "Repeat the new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match.",
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Studio forms. Every field arrives as a string from an input, so years and
 * blank optionals are validated as text and normalised in the Server Action.
 * The schema is shared by react-hook-form and the action, so the browser cannot
 * widen what the museum's own editor accepts.
 */
const yearField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^-?\d{1,4}$/.test(value), "Use a year, e.g. 1850 or -200.");

const slugField = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters.")
  .max(80, "Keep the slug under 80 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens only.");

export const exhibitAdminSchema = z.object({
  slug: slugField,
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,12}$/, "Four to twelve letters or digits; it is printed on the card."),
  title: z.string().trim().min(2, "Give the object a title.").max(120, "Keep the title under 120 characters."),
  subtitle: z.string().trim().max(160, "Keep the subtitle under 160 characters."),
  era: z.string().trim().min(2, "Name the era or period.").max(60, "Keep the era under 60 characters."),
  yearStart: yearField,
  yearEnd: yearField,
  roomId: z.string().min(1, "Choose a room."),
  summary: z
    .string()
    .trim()
    .min(20, "Write at least 20 characters; this is the gallery card.")
    .max(400, "Keep the summary under 400 characters."),
  body: z
    .string()
    .trim()
    .min(40, "Write at least 40 characters; this is the exhibit text.")
    .max(8000, "Keep the exhibit text under 8000 characters."),
  facts: z
    .string()
    .max(4000, "Keep the facts under 4000 characters.")
    .refine(
      (value) => value.split(/\r?\n/).filter((line) => line.trim()).length <= 8,
      "Eight facts at most.",
    ),
  tags: z.string().trim().max(200, "Keep the tags under 200 characters."),
  heroImage: z.string().trim().min(1, "Point at an image in /public or an https URL.").max(500),
  modelUrl: z.string().trim().max(500),
  modelUsdz: z.string().trim().max(500),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export type ExhibitAdminValues = z.infer<typeof exhibitAdminSchema>;

/**
 * The room form. `panoramaUrl` is either blank, a path inside `public/`, or the
 * `/api/panoramas/<id>` URL an upload produces. Absolute `https://` URLs are
 * refused on purpose: the room card goes through `next/image`, which only loads
 * hosts listed in `images.remotePatterns`, so an external URL would save and
 * then render as a broken image.
 */
export const roomAdminSchema = z.object({
  slug: slugField,
  name: z.string().trim().min(2, "Give the room a name.").max(80, "Keep the name under 80 characters."),
  floor: z.string().trim().min(2, "Name the floor.").max(60, "Keep the floor under 60 characters."),
  intro: z.string().trim().max(400, "Keep the introduction under 400 characters."),
  panoramaUrl: z
    .string()
    .trim()
    .max(500, "Keep the path under 500 characters.")
    .refine(
      (value) => value === "" || (value.startsWith("/") && !value.startsWith("//")),
      "Use a path inside /public (starting with /), or upload a panorama.",
    ),
  panoramaCredit: z
    .string()
    .trim()
    .max(200, "Keep the credit under 200 characters."),
});

export type RoomAdminValues = z.infer<typeof roomAdminSchema>;

