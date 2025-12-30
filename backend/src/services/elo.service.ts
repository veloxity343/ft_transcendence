/**
 * ELO Rating Service
 * Implements the ELO rating system for player skill ranking
 * 
 * How it works:
 * - Players start at 1200 ELO
 * - Winning against higher-rated opponents gives more points
 * - K-factor determines rating volatility (higher for new players)
 * - Expected score is calculated using logistic curve based on rating difference
 * - Actual outcome (1 for win, 0 for loss) is compared to expected score
 */
export class EloService {
  // K-factor determines how much ratings change after each game
  // Higher K = more volatile ratings (faster adjustments for new players)
  private static readonly K_FACTOR_NEW = 40;      // New players (< 10 games)
  private static readonly K_FACTOR_INTERMEDIATE = 32;  // 10-30 games
  private static readonly K_FACTOR_ESTABLISHED = 24;   // 30+ games
  
  // Starting ELO for new players
  static readonly INITIAL_ELO = 1200;

  /**
   * Get the K-factor based on number of games played
   */
  static getKFactor(gamesPlayed: number): number {
    if (gamesPlayed < 10) return this.K_FACTOR_NEW;
    if (gamesPlayed < 30) return this.K_FACTOR_INTERMEDIATE;
    return this.K_FACTOR_ESTABLISHED;
  }

  /**
   * Calculate expected score (probability of winning)
   * Uses the standard ELO formula: 1 / (1 + 10^((opponentElo - playerElo) / 400))
   * Result is between 0 and 1, representing win probability
   * @param playerElo - Current player's ELO
   * @param opponentElo - Opponent's ELO
   * @returns Expected score between 0 and 1 (0.5 = equal players)
   */
  static calculateExpectedScore(playerElo: number, opponentElo: number): number {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  }

  /**
   * Calculate new ELO rating after a match
   * Formula: newElo = currentElo + K * (actualScore - expectedScore)
   * - K-factor adjusts based on experience (see getKFactor)
   * - Actual score is 1 for win, 0 for loss
   * - Minimum ELO is capped at 100 to prevent negative ratings
   * @param currentElo - Player's current ELO
   * @param opponentElo - Opponent's ELO
   * @param won - Whether the player won
   * @param gamesPlayed - Player's total games played (for K-factor)
   * @returns New ELO rating (minimum 100)
   */
  static calculateNewElo(
    currentElo: number,
    opponentElo: number,
    won: boolean,
    gamesPlayed: number
  ): number {
    const expectedScore = this.calculateExpectedScore(currentElo, opponentElo);
    const actualScore = won ? 1 : 0;
    const kFactor = this.getKFactor(gamesPlayed);
    
    const newElo = currentElo + kFactor * (actualScore - expectedScore);
    
    // Round to nearest integer, minimum ELO is 100
    return Math.max(100, Math.round(newElo));
  }

  /**
   * Calculate ELO changes for both players after a match
   * @returns Object with new ELO ratings and changes for both players
   */
  static calculateMatchResult(
    player1Elo: number,
    player2Elo: number,
    player1Won: boolean,
    player1GamesPlayed: number,
    player2GamesPlayed: number
  ): {
    player1NewElo: number;
    player2NewElo: number;
    player1Change: number;
    player2Change: number;
  } {
    const player1NewElo = this.calculateNewElo(
      player1Elo,
      player2Elo,
      player1Won,
      player1GamesPlayed
    );
    
    const player2NewElo = this.calculateNewElo(
      player2Elo,
      player1Elo,
      !player1Won,
      player2GamesPlayed
    );

    return {
      player1NewElo,
      player2NewElo,
      player1Change: player1NewElo - player1Elo,
      player2Change: player2NewElo - player2Elo,
    };
  }

  /**
   * Calculate ELO for tournament matches
   * Uses slightly higher K-factor (1.25x) to make tournaments more impactful
   * This rewards tournament success more than casual games
   */
  static calculateTournamentMatchResult(
    player1Elo: number,
    player2Elo: number,
    player1Won: boolean,
    player1GamesPlayed: number,
    player2GamesPlayed: number,
    tournamentRound: number,
    totalRounds: number
  ): {
    player1NewElo: number;
    player2NewElo: number;
    player1Change: number;
    player2Change: number;
  } {
    // Tournament multiplier: later rounds have more impact
    // Finals = 1.5x, Semi-finals = 1.3x, etc.
    const roundMultiplier = 1 + (tournamentRound / totalRounds) * 0.5;
    
    const baseResult = this.calculateMatchResult(
      player1Elo,
      player2Elo,
      player1Won,
      player1GamesPlayed,
      player2GamesPlayed
    );

    // Apply tournament multiplier to changes
    const adjustedP1Change = Math.round(baseResult.player1Change * roundMultiplier);
    const adjustedP2Change = Math.round(baseResult.player2Change * roundMultiplier);

    return {
      player1NewElo: player1Elo + adjustedP1Change,
      player2NewElo: player2Elo + adjustedP2Change,
      player1Change: adjustedP1Change,
      player2Change: adjustedP2Change,
    };
  }

  /**
   * Get rank title based on ELO
   */
  static getRankTitle(elo: number): string {
    if (elo >= 2400) return 'Grandmaster';
    if (elo >= 2200) return 'Master';
    if (elo >= 2000) return 'Expert';
    if (elo >= 1800) return 'Class A';
    if (elo >= 1600) return 'Class B';
    if (elo >= 1400) return 'Class C';
    if (elo >= 1200) return 'Class D';
    return 'Beginner';
  }

  /**
   * Get rank color for UI display
   */
  static getRankColor(elo: number): string {
    if (elo >= 2400) return '#FFD700'; // Gold
    if (elo >= 2200) return '#E5E4E2'; // Platinum
    if (elo >= 2000) return '#C0C0C0'; // Silver
    if (elo >= 1800) return '#CD7F32'; // Bronze
    if (elo >= 1600) return '#4CAF50'; // Green
    if (elo >= 1400) return '#2196F3'; // Blue
    if (elo >= 1200) return '#9E9E9E'; // Gray
    return '#795548'; // Brown
  }
}
