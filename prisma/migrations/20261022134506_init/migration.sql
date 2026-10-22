-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "panoramaUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Exhibit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "era" TEXT NOT NULL,
    "yearStart" INTEGER,
    "yearEnd" INTEGER,
    "roomId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "facts" TEXT NOT NULL DEFAULT '[]',
    "heroImage" TEXT NOT NULL,
    "audioUrl" TEXT,
    "transcript" TEXT,
    "modelUrl" TEXT,
    "modelUsdz" TEXT,
    "modelScale" REAL NOT NULL DEFAULT 1,
    "tags" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exhibit_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hotspot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "posX" REAL NOT NULL DEFAULT 0,
    "posY" REAL NOT NULL DEFAULT 0,
    "posZ" REAL NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Hotspot_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitId" TEXT,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "credit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Media_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TourStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tourId" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "blurb" TEXT,
    CONSTRAINT "TourStop_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TourStop_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VISITOR',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'QR',
    "deviceId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scan_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stamp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT,
    "exhibitId" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Stamp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Stamp_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitId" TEXT,
    "rating" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "contact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_slug_key" ON "Room"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibit_slug_key" ON "Exhibit"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibit_code_key" ON "Exhibit"("code");

-- CreateIndex
CREATE INDEX "Exhibit_roomId_idx" ON "Exhibit"("roomId");

-- CreateIndex
CREATE INDEX "Exhibit_status_idx" ON "Exhibit"("status");

-- CreateIndex
CREATE INDEX "Hotspot_exhibitId_idx" ON "Hotspot"("exhibitId");

-- CreateIndex
CREATE INDEX "Media_exhibitId_idx" ON "Media"("exhibitId");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

-- CreateIndex
CREATE INDEX "TourStop_tourId_position_idx" ON "TourStop"("tourId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TourStop_tourId_exhibitId_key" ON "TourStop"("tourId", "exhibitId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Review_exhibitId_status_createdAt_idx" ON "Review"("exhibitId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_exhibitId_key" ON "Review"("userId", "exhibitId");

-- CreateIndex
CREATE INDEX "Scan_exhibitId_createdAt_idx" ON "Scan"("exhibitId", "createdAt");

-- CreateIndex
CREATE INDEX "Scan_deviceId_idx" ON "Scan"("deviceId");

-- CreateIndex
CREATE INDEX "Stamp_userId_idx" ON "Stamp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Stamp_deviceId_exhibitId_key" ON "Stamp"("deviceId", "exhibitId");
