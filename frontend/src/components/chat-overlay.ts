import { wsClient } from '../websocket/client';
import { storage } from '../utils/storage';
import { showToast } from '../utils/toast';
import { router } from '../router';

// SVG Icons
const icons = {
  chat: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  minimize: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  close: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  send: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
  global: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
  tournament: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>`,
  whisper: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  help: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  dnd: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`,
  user: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  plus: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  notification: `<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"></circle></svg>`,
};

// Chat tab types
type ChatTabType = 'global' | 'tournament' | 'whisper';

interface ChatTab {
  id: string;
  type: ChatTabType;
  name: string;
  targetUserId?: number; // For whisper tabs
  targetUsername?: string;
  tournamentId?: number; // For tournament tabs
  unreadCount: number;
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  userAvatar: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'notification' | 'error' | 'help';
  isWhisper?: boolean;
  fromMe?: boolean;
}

interface ChatState {
  isExpanded: boolean;
  tabs: ChatTab[];
  activeTabId: string;
  dndMode: boolean;
  ignoredUsers: Set<number>;
  whisperAllowList: Set<number>; // Users who whispered before DND was enabled
}

export class ChatOverlay {
  private container: HTMLElement;
  private state: ChatState;
  private unsubscribers: (() => void)[] = [];
  private currentUser: { id: string; username: string } | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'chat-overlay';
    this.state = {
      isExpanded: false,
      tabs: [],
      activeTabId: 'global',
      dndMode: false,
      ignoredUsers: new Set(),
      whisperAllowList: new Set(),
    };

    // Initialize with global tab
    this.state.tabs.push({
      id: 'global',
      type: 'global',
      name: 'Global',
      unreadCount: 0,
      messages: [],
    });

    this.currentUser = storage.getUserData();
    this.render();
    this.setupEventListeners();
    this.setupWebSocketHandlers();
    this.loadState();
  }

  private loadState(): void {
    // Load ignored users and DND state from localStorage
    const savedIgnored = localStorage.getItem('chat_ignored_users');
    if (savedIgnored) {
      try {
        const parsed = JSON.parse(savedIgnored);
        this.state.ignoredUsers = new Set(parsed);
      } catch (e) {
        console.error('Failed to load ignored users:', e);
      }
    }

    const savedDnd = localStorage.getItem('chat_dnd_mode');
    if (savedDnd === 'true') {
      this.state.dndMode = true;
    }
  }

  private saveState(): void {
    localStorage.setItem('chat_ignored_users', JSON.stringify([...this.state.ignoredUsers]));
    localStorage.setItem('chat_dnd_mode', this.state.dndMode.toString());
  }

  public mount(parent: HTMLElement): void {
    parent.appendChild(this.container);
    
    // Join global chat when mounted and connected
    if (wsClient.isConnected()) {
      this.joinGlobalChat();
    }
  }

  public unmount(): void {
    this.container.remove();
    this.unsubscribers.forEach(unsub => unsub());
  }

  public show(): void {
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public shouldShow(): boolean {
    const currentRoute = window.location.pathname;
    const hiddenRoutes = ['/login', '/register', '/oauth/callback'];
    return !hiddenRoutes.includes(currentRoute);
  }

  private joinGlobalChat(): void {
    wsClient.send('chat:join-room', { roomId: 'global' });
  }

  private render(): void {
    const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
    const totalUnread = this.state.tabs.reduce((sum, tab) => sum + tab.unreadCount, 0);

    this.container.innerHTML = `
      <style>
        #chat-overlay {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 9999;
          font-family: inherit;
        }

        .chat-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1.5px solid rgba(255, 255, 255, 0.6);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #1E3A5F;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .chat-bar:hover {
          background: rgba(255, 255, 255, 0.5);
          border-color: #4A7CC9;
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(74, 124, 201, 0.12);
        }

        .chat-bar-icon {
          color: #4A7CC9;
        }

        .chat-bar-text {
          font-weight: 600;
          font-size: 14px;
          color: #1E3A5F;
        }

        .chat-bar-badge {
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        .chat-bar-dnd {
          color: #ef4444;
        }

        .chat-window {
          display: ${this.state.isExpanded ? 'flex' : 'none'};
          flex-direction: column;
          width: 380px;
          height: 480px;
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid rgba(255, 255, 255, 0.6);
          border-radius: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(74, 124, 201, 0.1);
          border-bottom: 1.5px solid rgba(74, 124, 201, 0.2);
        }

        .chat-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1E3A5F;
          font-weight: 600;
          font-size: 15px;
        }

        .chat-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chat-header-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #4A6B8A;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chat-header-btn:hover {
          background: rgba(74, 124, 201, 0.15);
          color: #1E3A5F;
        }

        .chat-header-btn.dnd-active {
          color: #ef4444;
        }

        .chat-tabs {
          display: flex;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.05);
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .chat-tabs::-webkit-scrollbar {
          height: 4px;
        }

        .chat-tabs::-webkit-scrollbar-thumb {
          background: rgba(74, 124, 201, 0.3);
          border-radius: 2px;
        }

        .chat-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #4A6B8A;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          position: relative;
        }

        .chat-tab:hover {
          background: rgba(74, 124, 201, 0.1);
          color: #1E3A5F;
        }

        .chat-tab.active {
          background: rgba(74, 124, 201, 0.2);
          border-color: rgba(74, 124, 201, 0.4);
          color: #1E3A5F;
        }

        .chat-tab-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 8px;
          min-width: 14px;
          text-align: center;
        }

        .chat-tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #4A6B8A;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }

        .chat-tab-close:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: rgba(74, 124, 201, 0.3);
          border-radius: 3px;
        }

        .chat-message {
          display: flex;
          flex-direction: column;
          gap: 4px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chat-message-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chat-message-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4A7CC9, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: 600;
          overflow: hidden;
          flex-shrink: 0;
        }

        .chat-message-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .chat-message-username {
          font-weight: 600;
          font-size: 13px;
          color: #4A7CC9;
          cursor: pointer;
        }

        .chat-message-username:hover {
          text-decoration: underline;
        }

        .chat-message-username.me {
          color: #10b981;
        }

        .chat-message-time {
          font-size: 11px;
          color: #4A6B8A;
        }

        .chat-message-content {
          padding-left: 30px;
          font-size: 13px;
          color: #1E3A5F;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .chat-message.system {
          padding: 8px 12px;
          background: rgba(251, 191, 36, 0.15);
          border-left: 3px solid #fbbf24;
          border-radius: 0 8px 8px 0;
        }

        .chat-message.system .chat-message-content {
          padding-left: 0;
          color: #92400e;
          font-style: italic;
        }

        .chat-message.error {
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.15);
          border-left: 3px solid #ef4444;
          border-radius: 0 8px 8px 0;
        }

        .chat-message.error .chat-message-content {
          padding-left: 0;
          color: #991b1b;
        }

        .chat-message.help {
          padding: 8px 12px;
          background: rgba(30, 58, 95, 0.95);
          border-left: 3px solid #4A7CC9;
          border-radius: 0 8px 8px 0;
        }

        .chat-message.help .chat-message-content {
          padding-left: 0;
          color: #E8D4B8;
          font-family: monospace;
          font-size: 12px;
          white-space: pre-wrap;
        }

        .chat-message.whisper {
          background: rgba(168, 85, 247, 0.15);
          padding: 8px;
          border-radius: 8px;
          border-left: 3px solid #a855f7;
        }

        .chat-message.whisper .chat-message-username {
          color: #7c3aed;
        }

        .chat-input-container {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.05);
          border-top: 1.5px solid rgba(74, 124, 201, 0.2);
        }

        .chat-input {
          flex: 1;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.6);
          border: 1.5px solid rgba(255, 255, 255, 0.8);
          border-radius: 10px;
          color: #1E3A5F;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }

        .chat-input::placeholder {
          color: #4A6B8A;
        }

        .chat-input:focus {
          border-color: #4A7CC9;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 0 0 3px rgba(74, 124, 201, 0.15);
        }

        .chat-send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4A7CC9, #2563eb);
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chat-send-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(74, 124, 201, 0.4);
        }

        .chat-send-btn:active {
          transform: scale(0.98);
        }

        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #4A6B8A;
          text-align: center;
          padding: 20px;
        }

        .chat-empty-icon {
          margin-bottom: 12px;
          opacity: 0.5;
          color: #4A7CC9;
        }

        .chat-empty-text {
          font-size: 14px;
          margin-bottom: 8px;
          color: #1E3A5F;
        }

        .chat-empty-hint {
          font-size: 12px;
          color: #4A6B8A;
        }
      </style>

      ${!this.state.isExpanded ? `
        <div class="chat-bar" id="chatBar">
          <span class="chat-bar-icon">${icons.chat}</span>
          <span class="chat-bar-text">Chat</span>
          ${this.state.dndMode ? `<span class="chat-bar-dnd" title="Do Not Disturb">${icons.dnd}</span>` : ''}
          ${totalUnread > 0 ? `<span class="chat-bar-badge">${totalUnread > 99 ? '99+' : totalUnread}</span>` : ''}
        </div>
      ` : `
        <div class="chat-window">
          <div class="chat-header">
            <div class="chat-header-title">
              ${icons.chat}
              <span>Chat</span>
            </div>
            <div class="chat-header-actions">
              <button class="chat-header-btn ${this.state.dndMode ? 'dnd-active' : ''}" id="chatDndBtn" title="Do Not Disturb">
                ${icons.dnd}
              </button>
              <button class="chat-header-btn" id="chatHelpBtn" title="Help">
                ${icons.help}
              </button>
              <button class="chat-header-btn" id="chatMinimizeBtn" title="Minimize">
                ${icons.minimize}
              </button>
            </div>
          </div>

          <div class="chat-tabs">
            ${this.state.tabs.map(tab => `
              <div class="chat-tab ${tab.id === this.state.activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
                ${tab.type === 'global' ? icons.global : tab.type === 'tournament' ? icons.tournament : icons.whisper}
                <span>${this.escapeHtml(tab.name)}</span>
                ${tab.unreadCount > 0 ? `<span class="chat-tab-badge">${tab.unreadCount}</span>` : ''}
                ${tab.type !== 'global' ? `<button class="chat-tab-close" data-close-tab="${tab.id}">${icons.close}</button>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="chat-messages" id="chatMessages">
            ${activeTab && activeTab.messages.length > 0 ? 
              activeTab.messages.map(msg => this.renderMessage(msg)).join('') : `
              <div class="chat-empty">
                <div class="chat-empty-icon">${icons.chat}</div>
                <div class="chat-empty-text">No messages yet</div>
                <div class="chat-empty-hint">Type /? for help with commands</div>
              </div>
            `}
          </div>

          <div class="chat-input-container">
            <input 
              type="text" 
              class="chat-input" 
              id="chatInput" 
              placeholder="${this.getInputPlaceholder()}"
              maxlength="500"
              autocomplete="off"
            />
            <button class="chat-send-btn" id="chatSendBtn">
              ${icons.send}
            </button>
          </div>
        </div>
      `}
    `;

    // Re-attach event listeners after render
    this.attachDOMListeners();

    // Scroll to bottom if expanded
    if (this.state.isExpanded) {
      this.scrollToBottom();
    }
  }

  private renderMessage(msg: ChatMessage): string {
    const isMe = msg.userId === parseInt(this.currentUser?.id || '0');
    
    if (msg.type === 'system') {
      return `
        <div class="chat-message system">
          <div class="chat-message-content">${this.escapeHtml(msg.message)}</div>
        </div>
      `;
    }

    if (msg.type === 'error') {
      return `
        <div class="chat-message error">
          <div class="chat-message-content">${this.escapeHtml(msg.message)}</div>
        </div>
      `;
    }

    if (msg.type === 'help') {
      return `
        <div class="chat-message help">
          <div class="chat-message-content">${msg.message}</div>
        </div>
      `;
    }

    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const avatarContent = msg.userAvatar 
      ? `<img src="${msg.userAvatar}" alt="${msg.username}" />`
      : msg.username.charAt(0).toUpperCase();

    return `
      <div class="chat-message ${msg.isWhisper ? 'whisper' : ''}">
        <div class="chat-message-header">
          <div class="chat-message-avatar">${avatarContent}</div>
          <span class="chat-message-username ${isMe ? 'me' : ''}" data-user-id="${msg.userId}">${this.escapeHtml(msg.username)}</span>
          <span class="chat-message-time">${timeStr}</span>
        </div>
        <div class="chat-message-content">${this.escapeHtml(msg.message)}</div>
      </div>
    `;
  }

  private getInputPlaceholder(): string {
    const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
    if (!activeTab) return 'Type a message...';

    switch (activeTab.type) {
      case 'global': return 'Message global chat...';
      case 'tournament': return 'Message tournament chat...';
      case 'whisper': return `Whisper to ${activeTab.targetUsername}...`;
      default: return 'Type a message...';
    }
  }

  private attachDOMListeners(): void {
    // Chat bar click to expand
    const chatBar = this.container.querySelector('#chatBar');
    chatBar?.addEventListener('click', () => this.toggleExpanded());

    // Minimize button
    const minimizeBtn = this.container.querySelector('#chatMinimizeBtn');
    minimizeBtn?.addEventListener('click', () => this.toggleExpanded());

    // Help button
    const helpBtn = this.container.querySelector('#chatHelpBtn');
    helpBtn?.addEventListener('click', () => this.showHelp());

    // DND button
    const dndBtn = this.container.querySelector('#chatDndBtn');
    dndBtn?.addEventListener('click', () => this.toggleDnd());

    // Tab clicks
    this.container.querySelectorAll('.chat-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('chat-tab-close') || target.closest('.chat-tab-close')) {
          return; // Don't switch tabs when closing
        }
        const tabId = (tab as HTMLElement).dataset.tabId;
        if (tabId) this.switchTab(tabId);
      });
    });

    // Tab close buttons
    this.container.querySelectorAll('.chat-tab-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tabId = (btn as HTMLElement).dataset.closeTab;
        if (tabId) this.closeTab(tabId);
      });
    });

    // Send button
    const sendBtn = this.container.querySelector('#chatSendBtn');
    sendBtn?.addEventListener('click', () => this.handleSend());

    // Input enter key
    const input = this.container.querySelector('#chatInput') as HTMLInputElement;
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Username clicks for profile
    this.container.querySelectorAll('.chat-message-username').forEach(elem => {
      elem.addEventListener('click', (e) => {
        const userId = (elem as HTMLElement).dataset.userId;
        if (userId) {
          // Navigate to profile or show profile modal
          router.navigateTo('/profile');
          // Could also implement: this.showUserProfile(userId);
        }
      });
    });
  }

  private setupEventListeners(): void {
    // Route changes - update visibility
    window.addEventListener('popstate', () => {
      if (this.shouldShow()) {
        this.show();
      } else {
        this.hide();
      }
    });
  }

  private setupWebSocketHandlers(): void {
    // Connection events
    this.unsubscribers.push(wsClient.on('ws:connected', () => {
      this.joinGlobalChat();
    }));

    // Chat messages
    this.unsubscribers.push(wsClient.on('chat:message', (msg) => {
      this.handleIncomingMessage(msg.data);
    }));

    // System messages
    this.unsubscribers.push(wsClient.on('chat:system', (msg) => {
      this.handleSystemMessage(msg.data);
    }));

    // Direct messages
    this.unsubscribers.push(wsClient.on('chat:dm', (msg) => {
      this.handleDirectMessage(msg.data);
    }));

    // Room history
    this.unsubscribers.push(wsClient.on('chat:history', (msg) => {
      this.handleRoomHistory(msg.data);
    }));

    // Join/leave confirmations
    this.unsubscribers.push(wsClient.on('chat:joined', (msg) => {
      console.log('Joined chat room:', msg.data.roomId);
    }));

    // Chat errors
    this.unsubscribers.push(wsClient.on('chat:error', (msg) => {
      this.addLocalMessage('global', {
        id: `error-${Date.now()}`,
        userId: 0,
        username: 'System',
        userAvatar: '',
        message: msg.data.message || 'An error occurred',
        timestamp: new Date(),
        type: 'error',
      });
    }));

    // Whisper sent confirmation
    this.unsubscribers.push(wsClient.on('chat:dm-sent', () => {
      // Message already added locally
    }));

    // Ignore response
    this.unsubscribers.push(wsClient.on('chat:ignore-updated', (msg) => {
      const { userId, ignored } = msg.data;
      if (ignored) {
        this.state.ignoredUsers.add(userId);
      } else {
        this.state.ignoredUsers.delete(userId);
      }
      this.saveState();
    }));

    // DND response
    this.unsubscribers.push(wsClient.on('chat:dnd-updated', (msg) => {
      this.state.dndMode = msg.data.enabled;
      this.saveState();
      this.render();
    }));

    // Handle join game response
    this.unsubscribers.push(wsClient.on('chat:join-game', (msg) => {
      const { gameId, username } = msg.data;
      showToast(`Joining ${username}'s game...`, 'info');
      // Store gameId and navigate - game view reads from sessionStorage
      sessionStorage.setItem('join_game_id', gameId);
      router.navigateTo('/game');
    }));

    // Handle join tournament response  
    this.unsubscribers.push(wsClient.on('chat:join-tournament', (msg) => {
      const { tournamentId, name } = msg.data;
      showToast(`Joining tournament: ${name}`, 'info');
      sessionStorage.setItem('join_tournament_id', tournamentId);
      router.navigateTo('/tournament');
    }));

    // Handle friend added notification
    this.unsubscribers.push(wsClient.on('chat:friend-added', (msg) => {
      const { username, message } = msg.data;
      showToast(`${username} added you as a friend!`, 'info');
      this.addLocalMessage('global', {
        id: `friend-${Date.now()}`,
        userId: 0,
        username: 'System',
        userAvatar: '',
        message: message 
          ? `${username} added you as a friend: "${message}"`
          : `${username} added you as a friend!`,
        timestamp: new Date(),
        type: 'system',
      });
    }));

    // Friend request sent
    this.unsubscribers.push(wsClient.on('chat:friend-request-sent', (msg) => {
      this.addLocalMessage(this.state.activeTabId, {
        id: `system-${Date.now()}`,
        userId: 0,
        username: 'System',
        userAvatar: '',
        message: `Friend request sent to ${msg.data.username}`,
        timestamp: new Date(),
        type: 'system',
      });
    }));

    // Friend removed
    this.unsubscribers.push(wsClient.on('chat:friend-removed', (msg) => {
      this.addLocalMessage(this.state.activeTabId, {
        id: `system-${Date.now()}`,
        userId: 0,
        username: 'System',
        userAvatar: '',
        message: `Removed ${msg.data.username} from friends`,
        timestamp: new Date(),
        type: 'system',
      });
    }));

    // Invite sent
    this.unsubscribers.push(wsClient.on('chat:invite-sent', (msg) => {
      this.addLocalMessage(this.state.activeTabId, {
        id: `system-${Date.now()}`,
        userId: 0,
        username: 'System',
        userAvatar: '',
        message: `Invite sent to ${msg.data.username}`,
        timestamp: new Date(),
        type: 'system',
      });
    }));

    // Invite received
    this.unsubscribers.push(wsClient.on('chat:invite-received', (msg) => {
      const { fromUsername, type, id } = msg.data;
      showToast(`${fromUsername} invited you to ${type === 'tournament' ? 'a tournament' : 'a game'}!`, 'info');
      
      this.addLocalMessage('global', {
        id: `invite-${Date.now()}`,
        userId: 0,
        username: 'System',
        userAvatar: '',
        message: `${fromUsername} invited you to ${type === 'tournament' ? 'a tournament' : 'a game'}. Use /join ${fromUsername} to accept.`,
        timestamp: new Date(),
        type: 'notification',
      });
    }));

    // Tournament chat join
    this.unsubscribers.push(wsClient.on('tournament:chat-available', (msg) => {
      const { tournamentId, tournamentName } = msg.data;
      this.openTournamentTab(tournamentId, tournamentName);
    }));
  }

  private handleIncomingMessage(data: any): void {
    const { roomId, userId, username, userAvatar, message, timestamp, type } = data;

    // Check if ignored
    if (this.state.ignoredUsers.has(userId)) {
      return;
    }

    const chatMessage: ChatMessage = {
      id: data.id || `msg-${Date.now()}`,
      userId,
      username,
      userAvatar: userAvatar || '',
      message,
      timestamp: new Date(timestamp),
      type: type || 'message',
    };

    // Determine which tab this belongs to
    let tabId = 'global';
    if (roomId.startsWith('tournament-')) {
      tabId = roomId;
      // Create tab if doesn't exist
      if (!this.state.tabs.find(t => t.id === tabId)) {
        const tournamentId = parseInt(roomId.replace('tournament-', ''));
        this.openTournamentTab(tournamentId, `Tournament ${tournamentId}`);
      }
    }

    this.addLocalMessage(tabId, chatMessage);
  }

  private handleSystemMessage(data: any): void {
    const { roomId, message, timestamp } = data;

    const chatMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      userId: 0,
      username: 'System',
      userAvatar: '',
      message,
      timestamp: new Date(timestamp),
      type: 'system',
    };

    let tabId = 'global';
    if (roomId && roomId.startsWith('tournament-')) {
      tabId = roomId;
    }

    this.addLocalMessage(tabId, chatMessage);
  }

  private handleDirectMessage(data: any): void {
    const { roomId, userId, username, userAvatar, message, timestamp } = data;

    // Check if DND and not in allow list
    if (this.state.dndMode && !this.state.whisperAllowList.has(userId)) {
      // Auto-respond with DND message if this is a new conversation
      const existingTab = this.state.tabs.find(t => t.type === 'whisper' && t.targetUserId === userId);
      if (!existingTab) {
        wsClient.send('chat:send-dm', {
          targetUserId: userId,
          message: "Hello, I'm using Do Not Disturb mode. Please contact me later.",
        });
        return;
      }
    }

    // Check if ignored
    if (this.state.ignoredUsers.has(userId)) {
      return;
    }

    // Open or get whisper tab
    const isFromMe = userId === parseInt(this.currentUser?.id || '0');
    const otherUserId = isFromMe ? parseInt(roomId.split('-')[2]) : userId;
    const otherUsername = isFromMe ? (data.toUsername || 'User') : username;

    let tab = this.state.tabs.find(t => t.type === 'whisper' && t.targetUserId === otherUserId);
    if (!tab) {
      tab = this.openWhisperTab(otherUserId, otherUsername);
    }

    const chatMessage: ChatMessage = {
      id: data.id || `dm-${Date.now()}`,
      userId,
      username,
      userAvatar: userAvatar || '',
      message,
      timestamp: new Date(timestamp),
      type: 'message',
      isWhisper: true,
      fromMe: isFromMe,
    };

    this.addLocalMessage(tab.id, chatMessage);
  }

  private handleRoomHistory(data: any): void {
    const { roomId, messages } = data;

    let tabId = 'global';
    if (roomId.startsWith('tournament-')) {
      tabId = roomId;
    }

    const tab = this.state.tabs.find(t => t.id === tabId);
    if (tab && messages) {
      tab.messages = messages.map((msg: any) => ({
        id: msg.id,
        userId: msg.userId,
        username: msg.username,
        userAvatar: msg.userAvatar || '',
        message: msg.message,
        timestamp: new Date(msg.timestamp),
        type: msg.type || 'message',
      }));
      this.render();
    }
  }

  private addLocalMessage(tabId: string, message: ChatMessage): void {
    const tab = this.state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.messages.push(message);

    // Limit message history
    if (tab.messages.length > 100) {
      tab.messages = tab.messages.slice(-100);
    }

    // Update unread count if not active tab
    if (tabId !== this.state.activeTabId || !this.state.isExpanded) {
      tab.unreadCount++;
    }

    this.render();
  }

  private toggleExpanded(): void {
    this.state.isExpanded = !this.state.isExpanded;
    
    if (this.state.isExpanded) {
      // Clear unread for active tab
      const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
      if (activeTab) {
        activeTab.unreadCount = 0;
      }
    }
    
    this.render();
  }

  private switchTab(tabId: string): void {
    this.state.activeTabId = tabId;
    
    // Clear unread count
    const tab = this.state.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.unreadCount = 0;
    }
    
    this.render();
  }

  private closeTab(tabId: string): void {
    // Don't close global tab
    if (tabId === 'global') return;

    const tab = this.state.tabs.find(t => t.id === tabId);
    if (tab && tab.type === 'tournament') {
      // Leave tournament chat room
      wsClient.send('chat:leave-room', { roomId: tabId });
    }

    this.state.tabs = this.state.tabs.filter(t => t.id !== tabId);
    
    // Switch to global if active tab was closed
    if (this.state.activeTabId === tabId) {
      this.state.activeTabId = 'global';
    }
    
    this.render();
  }

  private openWhisperTab(userId: number, username: string): ChatTab {
    // Check if tab already exists
    let tab = this.state.tabs.find(t => t.type === 'whisper' && t.targetUserId === userId);
    if (tab) {
      this.state.activeTabId = tab.id;
      this.render();
      return tab;
    }

    // Add to whisper allow list (for DND)
    this.state.whisperAllowList.add(userId);

    tab = {
      id: `whisper-${userId}`,
      type: 'whisper',
      name: username,
      targetUserId: userId,
      targetUsername: username,
      unreadCount: 0,
      messages: [],
    };

    this.state.tabs.push(tab);
    this.state.activeTabId = tab.id;
    this.render();
    return tab;
  }

  private openTournamentTab(tournamentId: number, tournamentName: string): ChatTab {
    const tabId = `tournament-${tournamentId}`;
    
    // Check if tab already exists
    let tab = this.state.tabs.find(t => t.id === tabId);
    if (tab) {
      this.state.activeTabId = tab.id;
      this.render();
      return tab;
    }

    tab = {
      id: tabId,
      type: 'tournament',
      name: tournamentName,
      tournamentId,
      unreadCount: 0,
      messages: [],
    };

    this.state.tabs.push(tab);
    
    // Join the tournament chat room
    wsClient.send('chat:join-room', { roomId: tabId });
    
    this.render();
    return tab;
  }

  private handleSend(): void {
    const input = this.container.querySelector('#chatInput') as HTMLInputElement;
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    // Clear input
    input.value = '';

    // Parse and handle command
    if (text.startsWith('/')) {
      this.handleCommand(text);
      return;
    }

    // Regular message - send to active tab's room
    const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
    if (!activeTab) return;

    switch (activeTab.type) {
      case 'global':
        wsClient.send('chat:send-message', { roomId: 'global', message: text });
        break;
      case 'tournament':
        wsClient.send('chat:send-message', { roomId: activeTab.id, message: text });
        break;
      case 'whisper':
        if (activeTab.targetUserId) {
          wsClient.send('chat:send-dm', { targetUserId: activeTab.targetUserId, message: text });
          // Add message locally
          this.addLocalMessage(activeTab.id, {
            id: `dm-${Date.now()}`,
            userId: parseInt(this.currentUser?.id || '0'),
            username: this.currentUser?.username || 'You',
            userAvatar: '',
            message: text,
            timestamp: new Date(),
            type: 'message',
            isWhisper: true,
            fromMe: true,
          });
        }
        break;
    }
  }

  private handleCommand(input: string): void {
    const parts = input.slice(1).split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
      case '?':
        this.showHelp();
        break;

      case 'g': {
        const message = parts.slice(1).join(' ');
        if (message) {
          wsClient.send('chat:send-message', { roomId: 'global', message });
          // Switch to global tab
          this.switchTab('global');
        } else {
          this.showError('Usage: /g <message>');
        }
        break;
      }

      case 't': {
        const message = parts.slice(1).join(' ');
        // Find tournament tab
        const tournamentTab = this.state.tabs.find(t => t.type === 'tournament');
        if (tournamentTab && message) {
          wsClient.send('chat:send-message', { roomId: tournamentTab.id, message });
          this.switchTab(tournamentTab.id);
        } else if (!tournamentTab) {
          this.showError('You are not in a tournament');
        } else {
          this.showError('Usage: /t <message>');
        }
        break;
      }

      case 'w': {
        const username = parts[1];
        const message = parts.slice(2).join(' ');
        if (username && message) {
          wsClient.send('chat:whisper', { username, message });
        } else {
          this.showError('Usage: /w <username> <message>');
        }
        break;
      }

      case 'i': {
        const username = parts[1];
        if (username) {
          wsClient.send('chat:toggle-ignore', { username });
        } else {
          this.showError('Usage: /i <username>');
        }
        break;
      }

      case 'f': {
        const action = parts[1]?.toLowerCase();
        const username = parts[2];
        const message = parts.slice(3).join(' ');
        
        if (action === 'add' && username) {
          wsClient.send('chat:friend-add', { username, message: message || '' });
        } else if (action === 'remove' && username) {
          wsClient.send('chat:friend-remove', { username });
        } else {
          this.showError('Usage: /f add <username> [message] or /f remove <username>');
        }
        break;
      }

      case 'invite': {
        const type = parts[1]?.toLowerCase();
        if (type === 'tour') {
          const username = parts[2];
          if (username) {
            wsClient.send('chat:invite', { username, type: 'tournament' });
          } else {
            this.showError('Usage: /invite tour <username>');
          }
        } else {
          const username = parts[1];
          if (username) {
            wsClient.send('chat:invite', { username, type: 'game' });
          } else {
            this.showError('Usage: /invite <username> or /invite tour <username>');
          }
        }
        break;
      }

      case 'join': {
        const username = parts[1];
        if (username) {
          wsClient.send('chat:join-session', { username });
        } else {
          this.showError('Usage: /join <username>');
        }
        break;
      }

      case 'profile': {
        const username = parts[1];
        if (username) {
          wsClient.send('chat:view-profile', { username });
        } else {
          this.showError('Usage: /profile <username>');
        }
        break;
      }

      case 'dnd':
        this.toggleDnd();
        break;

      default:
        this.showError(`Unknown command: /${command}. Type /? for help.`);
    }
  }

  private showHelp(): void {
    const helpHtml = `
      <!-- <div class="overflow-x-auto bg-blue-100/20 border-l-4 border-blue-600 rounded-r-lg px-1 py-0.5"> -->
        <table class="min-w-full table-fixed text-sm text-left text-white/90 font-mono">
          <colgroup>
            <col class="w-1/3">
            <col class="w-2/3">
          </colgroup>
          <thead>
            <tr class="border-b border-white/30">
              <th class="px-2 py-1 h-12">Command</th>
              <th class="px-2 py-1 h-12">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/g [msg]</td>
              <td class="px-2 py-1 h-12">Send to global chat</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/t [msg]</td>
              <td class="px-2 py-1 h-12">Send to tournament chat</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/w &lt;usr&gt; [msg]</td>
              <td class="px-2 py-1 h-12">Whisper to user</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/i &lt;usr&gt;</td>
              <td class="px-2 py-1 h-12">Toggle ignore user</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/f add &lt;usr&gt; [msg]</td>
              <td class="px-2 py-1 h-12">Add friend</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/f remove &lt;usr&gt;</td>
              <td class="px-2 py-1 h-12">Remove friend</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/invite &lt;usr&gt;</td>
              <td class="px-2 py-1 h-12">Invite to game</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/invite tour &lt;usr&gt;</td>
              <td class="px-2 py-1 h-12">Invite to tournament</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/join &lt;usr&gt;</td>
              <td class="px-2 py-1 h-12">Join user's session</td>
            </tr>
            <tr class="even:bg-white/10 align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/profile &lt;usr&gt;</td>
              <td class="px-2 py-1 h-12">View profile</td>
            </tr>
            <tr class="align-top">
              <td class="px-2 py-1 h-12 whitespace-nowrap">/dnd</td>
              <td class="px-2 py-1 h-12">Toggle Do Not Disturb</td>
            </tr>
          </tbody>
        </table>
      <!-- </div> -->
    `;

    this.addLocalMessage(this.state.activeTabId, {
      id: `help-${Date.now()}`,
      userId: 0,
      username: 'System',
      userAvatar: '',
      message: helpHtml,
      timestamp: new Date(),
      type: 'help',
    });
  }

  private showError(message: string): void {
    this.addLocalMessage(this.state.activeTabId, {
      id: `error-${Date.now()}`,
      userId: 0,
      username: 'System',
      userAvatar: '',
      message,
      timestamp: new Date(),
      type: 'error',
    });
  }

  private toggleDnd(): void {
    this.state.dndMode = !this.state.dndMode;
    
    if (this.state.dndMode) {
      // Clear whisper allow list when enabling DND
      // (users who were already chatting can continue)
      showToast('Do Not Disturb enabled', 'info');
    } else {
      this.state.whisperAllowList.clear();
      showToast('Do Not Disturb disabled', 'info');
    }
    
    wsClient.send('chat:set-dnd', { enabled: this.state.dndMode });
    this.saveState();
    this.render();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const messagesContainer = this.container.querySelector('#chatMessages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 10);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public method to open a whisper from external code
  public openWhisper(userId: number, username: string): void {
    this.openWhisperTab(userId, username);
    this.state.isExpanded = true;
    this.render();
  }

  // Public method to join tournament chat
  public joinTournamentChat(tournamentId: number, tournamentName: string): void {
    this.openTournamentTab(tournamentId, tournamentName);
  }
}

// Singleton instance
let chatOverlayInstance: ChatOverlay | null = null;

export function initChatOverlay(): ChatOverlay {
  if (!chatOverlayInstance) {
    chatOverlayInstance = new ChatOverlay();
  }
  return chatOverlayInstance;
}

export function getChatOverlay(): ChatOverlay | null {
  return chatOverlayInstance;
}
