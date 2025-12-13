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
    "gameType" TEXT NOT NULL DEFAULT 'quickplay',
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tournamentId" INTEGER,
    "tournamentRound" INTEGER,
    "tournamentMatch" TEXT,
    CONSTRAINT "Game_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("createdAt", "duration", "endTime", "id", "player1", "player2", "score1", "score2", "startTime", "tournamentId", "tournamentMatch", "tournamentRound") SELECT "createdAt", "duration", "endTime", "id", "player1", "player2", "score1", "score2", "startTime", "tournamentId", "tournamentMatch", "tournamentRound" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
