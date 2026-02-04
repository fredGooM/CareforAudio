-- Create Category table
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Ensure existing category ids exist as categories
INSERT INTO "Category" ("id", "name")
SELECT DISTINCT "categoryId", "categoryId"
FROM "AudioTrack"
WHERE "categoryId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- Seed default categories
INSERT INTO "Category" ("id", "name", "color", "image")
VALUES
  ('c1', 'Pré-compétition', 'bg-blue-100 text-blue-800', '/images/pre_competition.png'),
  ('c2', 'Récupération', 'bg-green-100 text-green-800', '/images/recuperation.png'),
  ('c3', 'Sommeil', 'bg-indigo-100 text-indigo-800', '/images/sommeil.png'),
  ('c4', 'Concentration', 'bg-purple-100 text-purple-800', '/images/concentration.png')
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "color" = EXCLUDED."color",
  "image" = EXCLUDED."image";

-- Add FK on AudioTrack.categoryId
ALTER TABLE "AudioTrack"
ADD CONSTRAINT "AudioTrack_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
