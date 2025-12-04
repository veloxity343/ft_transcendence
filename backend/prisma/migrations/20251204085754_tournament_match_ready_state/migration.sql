/*
  Warnings:

  - You are about to drop the column `player1Ready` on the `tournaments` table. All the data in the column will be lost.
  - You are about to drop the column `player2Ready` on the `tournaments` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tournament_matches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "matchId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "player1Id" INTEGER,
    "player1Name" TEXT,
    "player2Id" INTEGER,
    "player2Name" TEXT,
    "player1Ready" BOOLEAN NOT NULL DEFAULT false,
    "player2Ready" BOOLEAN NOT NULL DEFAULT false,
    "winnerId" INTEGER,
    "gameId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tournament_matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tournament_matches" ("createdAt", "gameId", "id", "matchId", "matchNumber", "player1Id", "player1Name", "player2Id", "player2Name", "round", "scheduledTime", "status", "tournamentId", "updatedAt", "winnerId") SELECT "createdAt", "gameId", "id", "matchId", "matchNumber", "player1Id", "player1Name", "player2Id", "player2Name", "round", "scheduledTime", "status", "tournamentId", "updatedAt", "winnerId" FROM "tournament_matches";
DROP TABLE "tournament_matches";
ALTER TABLE "new_tournament_matches" RENAME TO "tournament_matches";
CREATE UNIQUE INDEX "tournament_matches_tournamentId_matchId_key" ON "tournament_matches"("tournamentId", "matchId");
CREATE TABLE "new_tournaments" (
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
INSERT INTO "new_tournaments" ("bracketType", "createdAt", "creatorId", "currentPlayers", "currentRound", "finishedAt", "id", "maxPlayers", "name", "startedAt", "status", "totalRounds", "updatedAt", "winnerId", "winnerName") SELECT "bracketType", "createdAt", "creatorId", "currentPlayers", "currentRound", "finishedAt", "id", "maxPlayers", "name", "startedAt", "status", "totalRounds", "updatedAt", "winnerId", "winnerName" FROM "tournaments";
DROP TABLE "tournaments";
ALTER TABLE "new_tournaments" RENAME TO "tournaments";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
