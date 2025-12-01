-- CreateTable
CREATE TABLE "tournaments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "bracketType" TEXT NOT NULL DEFAULT 'single_elimination',
    "status" TEXT NOT NULL DEFAULT 'registration',
    "currentPlayers" INTEGER NOT NULL DEFAULT 0,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "winnerName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tournaments_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournament_players" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "seed" INTEGER,
    "eliminatedInRound" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_players_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tournament_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournament_matches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "matchId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "player1Id" INTEGER,
    "player1Name" TEXT,
    "player2Id" INTEGER,
    "player2Name" TEXT,
    "winnerId" INTEGER,
    "gameId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tournament_matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "player1" INTEGER NOT NULL,
    "player2" INTEGER NOT NULL,
    "score1" INTEGER NOT NULL,
    "score2" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tournamentId" INTEGER,
    "tournamentRound" INTEGER,
    "tournamentMatch" TEXT,
    CONSTRAINT "Game_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("createdAt", "duration", "endTime", "id", "player1", "player2", "score1", "score2", "startTime") SELECT "createdAt", "duration", "endTime", "id", "player1", "player2", "score1", "score2", "startTime" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "tournament_players_tournamentId_userId_key" ON "tournament_players"("tournamentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_matches_tournamentId_matchId_key" ON "tournament_matches"("tournamentId", "matchId");
