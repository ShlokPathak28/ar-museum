"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/format-date";
import { reviewSchema, type ReviewValues } from "@/lib/schemas";

import { deleteReview, saveReview } from "./actions";

export type ReviewItem = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  authorName: string;
  isMine?: boolean;
  pending?: boolean;
};

type Props = {
  exhibitId: string;
  slug: string;
  reviews: ReviewItem[];
  average: number | null;
  count: number;
};

type OptimisticAction = { type: "save"; review: ReviewItem } | { type: "delete" };

const STARS = [1, 2, 3, 4, 5];

export default function ReviewSection({ exhibitId, slug, reviews, average, count }: Props) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, body: "" },
  });

  // `useWatch` rather than `watch()`: the latter returns a function, which the
  // React Compiler refuses to memoize (and warns about at lint time).
  const rating = useWatch({ control, name: "rating" });

  // The server render cannot know who is reading, so ownership is decided here.
  const baseReviews = useMemo(
    () => reviews.map((review) => ({ ...review, isMine: review.id === myReviewId })),
    [reviews, myReviewId],
  );

  const [optimisticReviews, dispatchOptimistic] = useOptimistic(
    baseReviews,
    (state: ReviewItem[], action: OptimisticAction) => {
      if (action.type === "delete") {
        return state.filter((review) => !review.isMine);
      }
      return [action.review, ...state.filter((review) => !review.isMine)];
    },
  );

  const userId = session?.user?.id;

  // Prefill the form with the visitor's existing review, if there is one.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    fetch(`/api/v1/reviews/mine?exhibitId=${encodeURIComponent(exhibitId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { review: { id: string; rating: number; body: string } | null } | null) => {
        if (cancelled) return;

        if (!data?.review) {
          setMyReviewId(null);
          reset({ rating: 0, body: "" });
          return;
        }

        setMyReviewId(data.review.id);
        reset({ rating: data.review.rating, body: data.review.body });
      })
      .catch(() => {
        // Prefilling is a convenience; the form still works without it.
      });

    return () => {
      cancelled = true;
    };
  }, [userId, exhibitId, reset]);

  function onSubmit(values: ReviewValues) {
    setFormError(null);

    startTransition(async () => {
      dispatchOptimistic({
        type: "save",
        review: {
          id: myReviewId ?? "pending",
          rating: values.rating,
          body: values.body.trim(),
          createdAt: new Date().toISOString(),
          authorName: session?.user.name ?? "You",
          isMine: true,
          pending: true,
        },
      });

      const result = await saveReview({ exhibitId, rating: values.rating, body: values.body });

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setMyReviewId(result.review.id);
      reset({ rating: result.review.rating, body: result.review.body });
    });
  }

  function onDelete() {
    if (!myReviewId) return;
    setFormError(null);

    startTransition(async () => {
      dispatchOptimistic({ type: "delete" });

      const result = await deleteReview(myReviewId);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setMyReviewId(null);
      reset({ rating: 0, body: "" });
    });
  }

  return (
    <section aria-labelledby="reviews-heading" className="mt-16 border-t border-ink/10 pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="reviews-heading" className="font-serif text-2xl tracking-tight">
          Visitor reviews
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          {count === 0
            ? "No reviews yet"
            : `${average?.toFixed(1) ?? "–"} / 5 · ${count} ${count === 1 ? "review" : "reviews"}`}
        </p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-xl border border-ink/10 bg-paper p-5">
          {sessionPending ? (
            <div aria-hidden className="space-y-3">
              <span className="block h-6 w-32 animate-pulse rounded bg-ink/5" />
              <span className="block h-24 w-full animate-pulse rounded bg-ink/5" />
            </div>
          ) : !session?.user ? (
            <>
              <p className="text-sm leading-relaxed text-ink-soft">
                Reviews are tied to an account, so you can edit or delete yours later. Browsing,
                3D and AR stay open to guests.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/exhibits/${slug}`)}`}
                className="mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
              >
                Sign in to review
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <fieldset>
                <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                  Rating
                </legend>
                <div className="mt-2 flex gap-1">
                  {STARS.map((value) => (
                    <label key={value} className="cursor-pointer">
                      <input
                        type="radio"
                        value={value}
                        {...register("rating", { setValueAs: Number })}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`text-2xl leading-none transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ochre ${
                          value <= rating ? "text-ochre" : "text-ink/20"
                        }`}
                      >
                        ★
                      </span>
                      <span className="sr-only">{value} of 5</span>
                    </label>
                  ))}
                </div>
                {errors.rating ? (
                  <p role="alert" className="mt-2 text-sm text-ochre">
                    {errors.rating.message}
                  </p>
                ) : null}
              </fieldset>

              <div>
                <label
                  htmlFor="review-body"
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
                >
                  Your review
                </label>
                <textarea
                  id="review-body"
                  rows={5}
                  placeholder="What caught your eye? A detail, a material, a story."
                  {...register("body")}
                  className="mt-1.5 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ochre"
                />
                {errors.body ? (
                  <p role="alert" className="mt-2 text-sm text-ochre">
                    {errors.body.message}
                  </p>
                ) : null}
              </div>

              {formError ? (
                <p role="alert" className="rounded-lg bg-ochre/10 px-3 py-2 text-sm text-ochre">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
                >
                  {isPending ? "Saving…" : myReviewId ? "Update review" : "Post review"}
                </button>
                {myReviewId ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={isPending}
                    className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-brick disabled:opacity-60"
                  >
                    Delete my review
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </div>

        <ul className="space-y-3">
          {optimisticReviews.length === 0 ? (
            <li className="rounded-xl border border-dashed border-ink/20 px-5 py-8 text-center text-sm text-ink-soft">
              No one has reviewed this object yet. Be the first.
            </li>
          ) : (
            optimisticReviews.map((review) => (
              <li
                key={review.id}
                className={`rounded-xl border p-5 ${
                  review.isMine ? "border-ochre/30 bg-ochre/5" : "border-ink/10 bg-paper"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {review.authorName}
                    {review.isMine ? <span className="text-ink-soft"> (you)</span> : null}
                  </p>
                  <p
                    aria-label={`${review.rating} out of 5`}
                    className="font-mono text-xs tracking-widest text-ochre"
                  >
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{review.body}</p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-soft">
                  {review.pending ? "Saving…" : formatDate(review.createdAt)}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
