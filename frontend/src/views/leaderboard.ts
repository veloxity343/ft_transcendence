import { storage } from '../utils/storage';
import { userApi } from '../api/user';
import { historyApi, getRankColor, getRankTitle } from '../api/history';
import { API_BASE_URL } from '../constants';

// SVG Icons
const icons = {
  trophy: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>`,
  crown: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
  </svg>`,
  spinner: `<svg class="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
  </svg>`,
  medal: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="8" r="6"></circle>
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"></path>
  </svg>`,
};

function getAvatarUrl(avatar?: string): string {
  if (!avatar || avatar === 'default-avatar.png') {
    return '';
  }
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  return `${API_BASE_URL}/uploads/${avatar}`;
}

function getAvatarFallback(username: string): string {
  const initial = username?.[0]?.toUpperCase() || '?';
  return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%234A7CC9%22>${initial}</text></svg>`;
}

function getRankIcon(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function getRankMedalColor(rank: number): string {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  return 'transparent';
}

function getPositionColor(rank: number): string {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  if (rank <= 20) return '#4A7CC9'; // Blue
  return '#1E3A5F'; // Navy/black
}

export function LeaderboardView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 flex flex-col items-center justify-start px-4 py-8';

  const user = storage.getUserData();
  const currentUserId = user?.id ? parseInt(String(user.id), 10) : null;

  container.innerHTML = `
    <div class="max-w-4xl w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-2">
          <span class="text-blue animate-glow">Global</span> <span class="text-navy">Leaderboard</span>
        </h1>
        <p class="text-navy-muted">Top players ranked by ELO rating</p>
      </div>

      <!-- Your Rank Card -->
      <div id="yourRankCard" class="glass-card p-6 mb-6">
        <div class="flex items-center justify-center">
          <div class="text-navy-muted">${icons.spinner}</div>
        </div>
      </div>

      <!-- Top 3 Podium -->
      <div id="podium" class="mb-8">
        <div class="flex items-center justify-center">
          <div class="text-navy-muted">${icons.spinner}</div>
        </div>
      </div>

      <!-- Full Rankings -->
      <div class="glass-card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-navy flex items-center gap-2">
            ${icons.medal} Rankings
          </h2>
          <div class="text-sm text-navy-muted">
            <span id="totalPlayers">-</span> ranked players
          </div>
        </div>

        <div id="rankingsList" class="space-y-2">
          <div class="flex items-center justify-center py-8">
            <div class="text-navy-muted">${icons.spinner}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load data
  loadLeaderboardData(container, currentUserId);

  return container;
}

async function loadLeaderboardData(container: HTMLElement, currentUserId: number | null): Promise<void> {
  const yourRankCard = container.querySelector('#yourRankCard') as HTMLElement;
  const podium = container.querySelector('#podium') as HTMLElement;
  const rankingsList = container.querySelector('#rankingsList') as HTMLElement;
  const totalPlayers = container.querySelector('#totalPlayers') as HTMLElement;

  try {
    // Load user's own stats
    const statsResponse = await historyApi.getMyStats();
    
    // Load leaderboard
    const leaderboardResponse = await userApi.getLeaderboard(100);

    if (!leaderboardResponse.success || !leaderboardResponse.data) {
      throw new Error('Failed to load leaderboard');
    }

    const leaderboard = leaderboardResponse.data.sort((a: any, b: any) => b.score - a.score);
    totalPlayers.textContent = leaderboard.length.toString();

    // Render your rank card
    if (statsResponse.success && statsResponse.data) {
      const stats = statsResponse.data;

      const actualRank = currentUserId 
        ? leaderboard.findIndex((e: any) => Number(e.id) === currentUserId) + 1 
        : 0;
      const rankColor = getPositionColor(actualRank);
      
      yourRankCard.innerHTML = `
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="text-4xl font-bold" style="color: ${rankColor}">
              ${actualRank > 0 ? `#${actualRank}` : 'Unranked'}
            </div>
            <div>
              <div class="text-lg font-semibold text-navy">Your Ranking</div>
              <div class="text-sm text-navy-muted">${stats.rankTitle} • ${stats.currentElo} ELO</div>
            </div>
          </div>
          <div class="flex gap-6 text-center">
            <div>
              <div class="text-2xl font-bold text-green-500">${stats.wins}</div>
              <div class="text-xs text-navy-muted">Wins</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-red-500">${stats.losses}</div>
              <div class="text-xs text-navy-muted">Losses</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-blue">${Math.round(stats.winRate)}%</div>
              <div class="text-xs text-navy-muted">Win Rate</div>
            </div>
          </div>
        </div>
      `;
    } else {
      yourRankCard.innerHTML = `
        <div class="text-center text-navy-muted">
          <p>Play some games to get ranked!</p>
          <a href="/game" class="text-blue hover:text-blue-dark mt-2 inline-block">Play Now →</a>
        </div>
      `;
    }

    // Render podium (top 3)
    if (leaderboard.length >= 3) {
      const [first, second, third] = leaderboard.slice(0, 3);
      
      podium.innerHTML = `
        <div class="flex items-end justify-center gap-4 h-64">
          <!-- 2nd Place -->
          <div class="flex flex-col items-center">
            <img 
              src="${getAvatarUrl(second.avatar)}" 
              alt="${second.username}"
              class="w-16 h-16 rounded-full object-cover border-4 border-gray-400 shadow-lg mb-2"
              onerror="this.src='${getAvatarFallback(second.username)}'"
            />
            <div class="text-lg font-bold text-navy ${currentUserId === Number(second.id) ? 'text-blue' : ''}">${second.username}</div>
            <div class="text-sm text-navy-muted">${second.score} ELO</div>
            <div class="w-24 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg mt-2 flex items-end justify-center pb-4" style="height: 120px;">
              <div class="text-3xl">🥈</div>
            </div>
          </div>
          
          <!-- 1st Place -->
          <div class="flex flex-col items-center">
            <div class="text-3xl mb-1">👑</div>
            <img 
              src="${getAvatarUrl(first.avatar)}" 
              alt="${first.username}"
              class="w-20 h-20 rounded-full object-cover border-4 border-yellow-400 shadow-lg mb-2"
              onerror="this.src='${getAvatarFallback(first.username)}'"
            />
            <div class="text-xl font-bold text-navy ${currentUserId === Number(first.id) ? 'text-blue' : ''}">${first.username}</div>
            <div class="text-sm text-navy-muted">${first.score} ELO</div>
            <div class="w-28 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg mt-2 flex items-end justify-center pb-4" style="height: 160px;">
              <div class="text-4xl">🥇</div>
            </div>
          </div>
          
          <!-- 3rd Place -->
          <div class="flex flex-col items-center">
            <img 
              src="${getAvatarUrl(third.avatar)}" 
              alt="${third.username}"
              class="w-14 h-14 rounded-full object-cover border-4 border-amber-600 shadow-lg mb-2"
              onerror="this.src='${getAvatarFallback(third.username)}'"
            />
            <div class="text-base font-bold text-navy ${currentUserId === Number(third.id) ? 'text-blue' : ''}">${third.username}</div>
            <div class="text-sm text-navy-muted">${third.score} ELO</div>
            <div class="w-20 bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-lg mt-2 flex items-end justify-center pb-4" style="height: 80px;">
              <div class="text-2xl">🥉</div>
            </div>
          </div>
        </div>
      `;
    } else if (leaderboard.length > 0) {
      // Less than 3 players
      podium.innerHTML = `
        <div class="text-center text-navy-muted p-4">
          <p>Need more players for the podium!</p>
        </div>
      `;
    } else {
      podium.innerHTML = '';
    }

    // Render full rankings list
    if (leaderboard.length > 0) {
      rankingsList.innerHTML = leaderboard.map((entry: any, index: number) => {
        const rank = index + 1;
        const isCurrentUser = currentUserId === Number(entry.id);
        const rankColor = getRankColor(entry.score);
        const winRate = entry.gamesPlayed > 0 
          ? Math.round((entry.gamesWon / entry.gamesPlayed) * 100) 
          : 0;
        
        let rowClass = 'flex items-center p-4 rounded-lg transition-all hover:bg-white/50';
        if (rank === 1) rowClass += ' bg-yellow-50 border-2 border-yellow-300';
        else if (rank === 2) rowClass += ' bg-gray-50 border-2 border-gray-300';
        else if (rank === 3) rowClass += ' bg-amber-50 border-2 border-amber-300';
        else rowClass += ' bg-white/30 border border-white/50';
        
        if (isCurrentUser) {
          rowClass += ' ring-2 ring-blue ring-offset-2';
        }
        
        return `
          <div class="${rowClass}">
            <!-- Rank -->
            <div class="w-12 text-center">
              ${rank <= 3 
                ? `<span class="text-2xl">${getRankIcon(rank)}</span>`
                : `<span class="text-lg font-bold text-navy-muted">#${rank}</span>`
              }
            </div>
            
            <!-- Player Info -->
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src="${getAvatarUrl(entry.avatar)}" 
                alt="${entry.username}"
                class="w-12 h-12 rounded-full object-cover border-2"
                style="border-color: ${rankColor}"
                onerror="this.src='${getAvatarFallback(entry.username)}'"
              />
              <div class="min-w-0">
                <div class="font-bold text-navy truncate ${isCurrentUser ? 'text-blue' : ''}">
                  ${entry.username}
                  ${isCurrentUser ? '<span class="text-xs bg-blue text-white px-2 py-0.5 rounded-full ml-2">You</span>' : ''}
                </div>
                <div class="text-xs text-navy-muted">
                  <span style="color: ${rankColor}">${getRankTitle(entry.score)}</span>
                </div>
              </div>
            </div>
            
            <!-- Stats -->
            <div class="hidden md:flex items-center gap-6 text-center">
              <div>
                <div class="font-semibold text-navy">${entry.gamesPlayed}</div>
                <div class="text-xs text-navy-muted">Games</div>
              </div>
              <div>
                <div class="font-semibold text-green-500">${entry.gamesWon}</div>
                <div class="text-xs text-navy-muted">Wins</div>
              </div>
              <div>
                <div class="font-semibold ${winRate >= 50 ? 'text-green-500' : 'text-red-500'}">${winRate}%</div>
                <div class="text-xs text-navy-muted">Win Rate</div>
              </div>
            </div>
            
            <!-- ELO -->
            <div class="w-24 text-right">
              <div class="text-xl font-bold" style="color: ${rankColor}">${entry.score}</div>
              <div class="text-xs text-navy-muted">ELO</div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      rankingsList.innerHTML = `
        <div class="text-center text-navy-muted py-8">
          <p>No ranked players yet.</p>
          <p class="text-sm mt-1">Be the first to get ranked!</p>
          <a href="/game" class="btn-primary mt-4 inline-block">Play Now</a>
        </div>
      `;
    }

  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    
    yourRankCard.innerHTML = `
      <div class="text-center text-red-500">
        <p>Failed to load your ranking</p>
      </div>
    `;
    
    podium.innerHTML = '';
    
    rankingsList.innerHTML = `
      <div class="text-center text-red-500 py-8">
        <p>Failed to load leaderboard</p>
        <button onclick="location.reload()" class="btn-secondary mt-4">Retry</button>
      </div>
    `;
  }
}
