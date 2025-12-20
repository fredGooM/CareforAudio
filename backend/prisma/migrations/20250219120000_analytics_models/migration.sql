CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audioId" TEXT NOT NULL,
    "lastPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "timesListened" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProgress_userId_audioId_key" ON "UserProgress"("userId", "audioId");

ALTER TABLE "UserProgress"
  ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProgress"
  ADD CONSTRAINT "UserProgress_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "AudioTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AudioLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audioId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AudioLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AudioLog"
  ADD CONSTRAINT "AudioLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioLog"
  ADD CONSTRAINT "AudioLog_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "AudioTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
