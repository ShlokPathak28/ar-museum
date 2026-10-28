-- CreateTable
CREATE TABLE "ModelAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'model/gltf-binary',
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "draco" BOOLEAN NOT NULL DEFAULT false,
    "credit" TEXT,
    "bytes" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exhibitId" TEXT NOT NULL,
    CONSTRAINT "ModelAsset_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelAsset_exhibitId_key" ON "ModelAsset"("exhibitId");
