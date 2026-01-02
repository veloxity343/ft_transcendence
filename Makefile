.PHONY: help setup ssl build up down restart logs clean clean-all rebuild \
        db-migrate db-reset db-seed test lint format check-env prod-up \
        prod-build prod-down prod-logs backup restore health

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
BLUE := \033[0;34m
RESET := \033[0m

APP_NAME := ft_transcendence
COMPOSE_FILE := docker-compose.yml
LOG_FILE := logs/$(APP_NAME).log

# Load environment variables from .env if it exists
-include .env
export

# Default to localhost if HOST_IP not set
HOST_IP ?= localhost

# ============================================================================
# HELP
# ============================================================================

help:
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(GREEN)$(APP_NAME) - Makefile Commands$(RESET)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@echo "$(YELLOW)Setup & SSL:$(RESET)"
	@echo "  make setup          Setup project directories and environment"
	@echo "  make ssl            Generate self-signed SSL certificates"
	@echo ""
	@echo "$(YELLOW)Development:$(RESET)"
	@echo "  make build          Build all Docker images"
	@echo "  make up             Start all services (docker compose up -d)"
	@echo "  make down           Stop all services"
	@echo "  make restart        Restart all services"
	@echo "  make logs           Follow all service logs"
	@echo ""
	@echo "$(YELLOW)Database:$(RESET)"
	@echo "  make db-migrate     Run pending database migrations"
	@echo "  make db-reset       Reset database (dev only)"
	@echo ""
	@echo "$(YELLOW)Code Quality:$(RESET)"
	@echo "  make test           Run backend and frontend tests"
	@echo "  make lint           Lint backend and frontend code"
	@echo "  make format         Format code with Prettier/ESLint"
	@echo ""
	@echo "$(YELLOW)Production:$(RESET)"
	@echo "  make prod-build     Build production images (optimized)"
	@echo "  make prod-up        Start production stack"
	@echo "  make prod-down      Stop production stack"
	@echo "  make prod-logs      Follow production logs"
	@echo "  make health         Check health of all services"
	@echo ""
	@echo "$(YELLOW)Maintenance:$(RESET)"
	@echo "  make backup         Backup database and uploads"
	@echo "  make restore        Restore from backup"
	@echo "  make check-env      Validate required environment variables"
	@echo "  make clean          Remove stopped containers & dangling images"
	@echo "  make clean-all      Remove all Docker resources (⚠️  destructive)"
	@echo "  make rebuild        Full rebuild (clean + build + up)"
	@echo ""
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"

# ============================================================================
# SETUP & CONFIGURATION
# ============================================================================

setup: check-env create-dirs
	@echo "$(GREEN)✓ Project setup complete$(RESET)"
	@echo "$(YELLOW)Next steps:$(RESET)"
	@echo "  1. Edit .env file and set your configuration (HOST_IP, OAuth credentials, etc.)"
	@echo "  2. Run 'make ssl' to generate SSL certificates"
	@echo "  3. Run 'make up' to start services"

check-env:
	@echo "$(YELLOW)Checking environment files...$(RESET)"
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "$(GREEN)✓ Created .env from template$(RESET)"; \
		echo "$(YELLOW)⚠️  Please edit .env and configure:$(RESET)"; \
		echo "    - HOST_IP (your VM's IP address)"; \
		echo "    - JWT_SECRET (generate a random secret)"; \
		echo "    - FORTYTWO_ID and FORTYTWO_SECRET (from 42 intra)"; \
		echo "    - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (from Google Cloud)"; \
	else \
		echo "$(GREEN)✓ .env exists$(RESET)"; \
	fi

create-dirs:
	@echo "$(YELLOW)Creating required directories...$(RESET)"
	@mkdir -p backend/data backend/uploads backend/ssl
	@mkdir -p nginx/ssl logs
	@echo "$(GREEN)✓ Directories created$(RESET)"

ssl: create-dirs
	@echo "$(YELLOW)Generating self-signed SSL certificates for $(HOST_IP)...$(RESET)"
	@if [ ! -f backend/ssl/cert.pem ] || [ ! -f backend/ssl/key.pem ]; then \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		  -keyout backend/ssl/key.pem \
		  -out backend/ssl/cert.pem \
		  -subj "/C=MY/ST=KL/L=KualaLumpur/O=42/CN=$(HOST_IP)" && \
		cp backend/ssl/*.pem nginx/ssl/ && \
		echo "$(GREEN)✓ SSL certificates generated for $(HOST_IP)$(RESET)"; \
	else \
		echo "$(YELLOW)SSL certificates exist. To regenerate, delete them first:$(RESET)"; \
		echo "  rm backend/ssl/*.pem nginx/ssl/*.pem"; \
		echo "  make ssl"; \
	fi

# ============================================================================
# DOCKER OPERATIONS
# ============================================================================

build:
	@echo "$(YELLOW)Building Docker images...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) build
	@echo "$(GREEN)✓ Build complete$(RESET)"

up: create-dirs ssl
	@echo "$(YELLOW)Starting services...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) up -d
	@sleep 2
	@echo "$(GREEN)✓ Services started$(RESET)"
	@$(MAKE) --no-print-directory service-summary

down:
	@echo "$(YELLOW)Stopping services...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✓ Services stopped$(RESET)"

restart: down up
	@echo "$(GREEN)✓ Services restarted$(RESET)"

logs:
	@echo "$(YELLOW)Following logs (Ctrl+C to exit)...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) logs -f

logs-backend:
	@docker compose -f $(COMPOSE_FILE) logs -f backend

logs-frontend:
	@docker compose -f $(COMPOSE_FILE) logs -f frontend

logs-nginx:
	@docker compose -f $(COMPOSE_FILE) logs -f nginx

health:
	@echo "$(YELLOW)Checking service health...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "$(YELLOW)Testing API endpoint...$(RESET)"
	@curl -sk https://$(HOST_IP)/api/health 2>/dev/null && echo "$(GREEN)✓ API healthy$(RESET)" || echo "$(RED)✗ API unreachable$(RESET)"

service-summary:
	@echo ""
	@echo "$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(GREEN)$(APP_NAME) is running$(RESET)"
	@echo "$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(BLUE)Frontend:$(RESET)   https://$(HOST_IP)"
	@echo "$(BLUE)Backend API:$(RESET) https://$(HOST_IP)/api"
	@echo "$(BLUE)WebSocket:$(RESET)  wss://$(HOST_IP)/ws"
	@echo ""
	@echo "$(YELLOW)View logs:$(RESET)   make logs"
	@echo "$(YELLOW)Check health:$(RESET) make health"
	@echo "$(YELLOW)Stop services:$(RESET) make down"
	@echo "$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""

# ============================================================================
# DATABASE OPERATIONS
# ============================================================================

db-migrate:
	@echo "$(YELLOW)Running database migrations...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) run --rm backend npx prisma migrate deploy
	@echo "$(GREEN)✓ Migrations complete$(RESET)"

db-reset:
	@echo "$(RED)⚠️  This will reset your database (dev only)$(RESET)"
	@read -p "Continue? (y/N) " -r; \
	if [ "$$REPLY" = "y" ]; then \
		docker compose -f $(COMPOSE_FILE) run --rm backend npx prisma migrate reset --force; \
		echo "$(GREEN)✓ Database reset$(RESET)"; \
	else \
		echo "$(YELLOW)Cancelled$(RESET)"; \
	fi

db-seed:
	@echo "$(YELLOW)Seeding database...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) run --rm backend npx prisma db seed
	@echo "$(GREEN)✓ Database seeded$(RESET)"

# ============================================================================
# CODE QUALITY
# ============================================================================

test:
	@echo "$(YELLOW)Running tests...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) run --rm backend npm run test
	@echo "$(GREEN)✓ Tests complete$(RESET)"

lint:
	@echo "$(YELLOW)Linting code...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) run --rm backend npm run lint
	@echo "$(GREEN)✓ Lint complete$(RESET)"

format:
	@echo "$(YELLOW)Formatting code...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) run --rm backend npm run format
	@echo "$(GREEN)✓ Format complete$(RESET)"

# ============================================================================
# PRODUCTION DEPLOYMENT
# ============================================================================

prod-build: check-env ssl
	@echo "$(YELLOW)Building production images...$(RESET)"
	@ENVIRONMENT=production docker compose -f $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)✓ Production build complete$(RESET)"

prod-up: prod-build
	@echo "$(YELLOW)Starting production services...$(RESET)"
	@ENVIRONMENT=production docker compose -f $(COMPOSE_FILE) up -d
	@sleep 3
	@echo "$(GREEN)✓ Production services started$(RESET)"
	@$(MAKE) --no-print-directory service-summary

prod-down:
	@echo "$(YELLOW)Stopping production services...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✓ Production services stopped$(RESET)"

prod-logs:
	@echo "$(YELLOW)Following production logs (Ctrl+C to exit)...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) logs -f

# ============================================================================
# BACKUP & RESTORE
# ============================================================================

backup:
	@echo "$(YELLOW)Creating backup...$(RESET)"
	@mkdir -p backups
	@tar -czf backups/transcendence-backup-$$(date +%Y%m%d-%H%M%S).tar.gz \
		backend/data backend/uploads 2>/dev/null || true
	@echo "$(GREEN)✓ Backup created$(RESET)"

restore:
	@echo "$(YELLOW)Available backups:$(RESET)"
	@ls -lh backups/ 2>/dev/null || echo "No backups found"
	@read -p "Enter backup filename to restore: " backup; \
	if [ -z "$$backup" ]; then \
		echo "$(YELLOW)Cancelled$(RESET)"; \
	else \
		echo "$(YELLOW)Restoring from $$backup...$(RESET)"; \
		tar -xzf backups/$$backup; \
		echo "$(GREEN)✓ Restore complete$(RESET)"; \
	fi

# ============================================================================
# CLEANUP
# ============================================================================

clean:
	@echo "$(YELLOW)Cleaning up Docker resources...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) down --remove-orphans
	@docker system prune -f
	@echo "$(GREEN)✓ Cleanup complete$(RESET)"

clean-all: down
	@echo "$(RED)⚠️  This will remove ALL Docker resources including images and volumes$(RESET)"
	@read -p "Continue? (y/N) " -r; \
	if [ "$$REPLY" = "y" ]; then \
		docker system prune -af --volumes; \
		echo "$(GREEN)✓ All Docker resources removed$(RESET)"; \
	else \
		echo "$(YELLOW)Cancelled$(RESET)"; \
	fi

rebuild: clean build up
	@echo "$(GREEN)✓ Full rebuild complete$(RESET)"

# ============================================================================
# DEFAULT TARGET
# ============================================================================

.DEFAULT_GOAL := help
