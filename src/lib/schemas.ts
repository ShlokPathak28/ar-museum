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
