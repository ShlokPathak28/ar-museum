import { z } from "zod";

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
 * Studio forms. Every field arrives as a string from an input, so years and
 * blank optionals are validated as text and normalised in the Server Action.
 * The schema is shared by react-hook-form and the action, so the browser cannot
 * widen what the museum's own editor accepts.
 */
const yearField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^-?\d{1,4}$/.test(value), "Use a year, e.g. 1850 or -200.");

export const exhibitAdminSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(80, "Keep the slug under 80 characters.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens only."),
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

