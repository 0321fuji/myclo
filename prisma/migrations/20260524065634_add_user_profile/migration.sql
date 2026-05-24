-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gender" TEXT,
    "ageGroup" TEXT,
    "height" INTEGER,
    "bodyType" TEXT,
    "personalColor" TEXT,
    "preferredStyles" TEXT NOT NULL DEFAULT '[]',
    "dislikedStyles" TEXT NOT NULL DEFAULT '[]',
    "inspirations" TEXT,
    "occupation" TEXT,
    "scenes" TEXT NOT NULL DEFAULT '[]',
    "avoid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
