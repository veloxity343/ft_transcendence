-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tournament_players" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "userId" INTEGER,
    "username" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "seed" INTEGER,
    "eliminatedInRound" INTEGER,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_players_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tournament_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tournament_players" ("avatar", "createdAt", "eliminatedInRound", "id", "seed", "tournamentId", "userId", "username") SELECT "avatar", "createdAt", "eliminatedInRound", "id", "seed", "tournamentId", "userId", "username" FROM "tournament_players";
DROP TABLE "tournament_players";
ALTER TABLE "new_tournament_players" RENAME TO "tournament_players";
CREATE UNIQUE INDEX "tournament_players_tournamentId_userId_key" ON "tournament_players"("tournamentId", "userId");
CREATE TABLE "new_tournaments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "bracketType" TEXT NOT NULL DEFAULT 'single_elimination',
    "isLocal" BOOLEAN NOT NULL DEFAULT false,
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
