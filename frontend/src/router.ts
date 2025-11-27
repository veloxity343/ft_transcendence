import { authApi } from './api/auth';
import type { Route, RouteConfig } from './types';

class Router {
  private routes: Map<Route, RouteConfig> = new Map();
  private currentRoute: Route | null = null;
  private appContainer: HTMLElement | null = null;

  constructor() {
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });

    // Intercept link clicks for SPA navigation
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.getAttribute('href')?.startsWith('/')) {
        e.preventDefault();
        this.navigateTo(link.getAttribute('href') as Route);
      }
    });
  }

  setAppContainer(container: HTMLElement): void {
    this.appContainer = container;
  }

  registerRoute(config: RouteConfig): void {
    this.routes.set(config.path, config);
  }

  navigateTo(path: Route): void {
    const route = this.routes.get(path);
    
    if (!route) {
      console.error(`Route ${path} not found`);
      this.navigateTo('/');
      return;
    }

    // Check authentication
    if (route.requiresAuth && !authApi.isAuthenticated()) {
      this.navigateTo('/login');
      return;
    }

    // Update browser history
    if (this.currentRoute !== path) {
      window.history.pushState({}, '', path);
      this.currentRoute = path;
    }

    // Update document title
    document.title = `${route.title} - Transcendence`;

    // Render the component
    this.render(route);
  }

  private handleRouteChange(): void {
    const path = window.location.pathname as Route;
    this.currentRoute = path;
    const route = this.routes.get(path);
    
    if (route) {
      this.render(route);
    } else {
      this.navigateTo('/');
    }
  }

  private render(route: RouteConfig): void {
    if (!this.appContainer) {
      console.error('App container not set');
      return;
    }

    // Clear existing content
    this.appContainer.innerHTML = '';

    // Render new component
    const component = route.component();
    this.appContainer.appendChild(component);
  }

  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  init(): void {
    // Get initial route from URL
    const path = window.location.pathname as Route;
    const route = this.routes.get(path);
    
    if (route) {
      this.navigateTo(path);
    } else {
      this.navigateTo('/');
    }
  }

  // Helper to create navigation link
  createLink(path: Route, text: string, className: string = ''): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = path;
    link.textContent = text;
    link.className = className;
    return link;
  }
}

export const router = new Router();
