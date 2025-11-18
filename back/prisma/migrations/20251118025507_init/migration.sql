-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'default-avatar.png',
    "id42" INTEGER,
    "twoFA" BOOLEAN NOT NULL DEFAULT false,
    "twoFAsecret" TEXT,
    "hashedRtoken" TEXT,
    "score" INTEGER NOT NULL DEFAULT 1200,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "gamesLost" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "winRate" REAL NOT NULL DEFAULT 0,
    "playTime" INTEGER NOT NULL DEFAULT 0,
    "gameHistory" TEXT NOT NULL DEFAULT '[]',
    "friends" TEXT NOT NULL DEFAULT '[]',
    "adding" TEXT NOT NULL DEFAULT '[]',
    "added" TEXT NOT NULL DEFAULT '[]',
    "blocks" TEXT NOT NULL DEFAULT '[]',
    "blocking" TEXT NOT NULL DEFAULT '[]',
    "blocked" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "player1" INTEGER NOT NULL,
    "player2" INTEGER NOT NULL,
    "score1" INTEGER NOT NULL,
    "score2" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_id42_key" ON "User"("id42");
