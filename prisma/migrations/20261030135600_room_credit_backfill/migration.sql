-- Backfill the credit lines that used to live in a code map keyed by slug
-- (PANORAMA_CREDIT in src/app/rooms/[slug]/page.tsx). From here the credit is
-- part of the room, so an admin-created room can carry its own.
UPDATE "Room" SET "panoramaCredit" = 'Museum of Ethnography by Oliksiy Yakovlyev · Poly Haven · CC0 (stand-in)'
WHERE "slug" = 'material-worlds' AND "panoramaCredit" IS NULL;

UPDATE "Room" SET "panoramaCredit" = 'Church Museum by Dario Barresi · Poly Haven · CC0 (stand-in)'
WHERE "slug" = 'everyday-objects' AND "panoramaCredit" IS NULL;
