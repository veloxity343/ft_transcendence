import { API_BASE_URL } from '../constants';

/**
 * Converts an avatar filename/URL to a full URL
 * @param avatar - Avatar filename or URL
 * @returns Full avatar URL or empty string if invalid
 */
export function getAvatarUrl(avatar?: string): string {
  if (!avatar || avatar === 'default-avatar.png') {
    return '';
  }
  
  // Already a full URL
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  // Relative path - prepend API base
  return `${API_BASE_URL}/uploads/${avatar}`;
}

/**
 * Generates SVG fallback for when avatar image fails to load
 * @param username - User's display name
 * @returns Data URI for SVG with user's initial
 */
export function getAvatarFallback(username: string): string {
  const initial = username?.[0]?.toUpperCase() || '?';
  return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%234A7CC9%22>${initial}</text></svg>`;
}
