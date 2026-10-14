# ==============================================================================
# Travel API - Docker-Focused Makefile
# Short & efficient command shortcuts for Docker development & production.
# ==============================================================================

.PHONY: help up dev up-log down stop restart logs logs-all build rebuild \
        shell db-shell ps status clean-docker \
        prod-up prod-down prod-restart prod-logs prod-status

# Default target when running `make`
.DEFAULT_GOAL := help

# ------------------------------------------------------------------------------
# 🐳 Docker Development (Default Compose: docker-compose.yaml)
# ------------------------------------------------------------------------------

up: ## Start all Docker containers in background (MySQL + NestJS API)
	docker compose up

dev: up ## Alias for 'make up' - Start development environment

up-log: ## Start containers with rebuild and attached live logs
	docker compose up --build

down: ## Stop and remove all dev Docker containers & networks
	docker compose down

stop: ## Stop dev Docker containers without removing them
	docker compose stop

restart: ## Restart dev Docker containers
	docker compose restart

logs: ## View real-time logs for travel_api container
	docker compose logs -f travel_api

logs-all: ## View real-time logs for all containers (API & MySQL)
	docker compose logs -f

build: ## Rebuild dev Docker images
	docker compose build

rebuild: ## Rebuild images and restart containers in background
	docker compose up -d --build

# ------------------------------------------------------------------------------
# 💻 Interactive Shell & DB Tools
# ------------------------------------------------------------------------------

shell: ## Open interactive shell (sh) inside travel_api container
	docker compose exec travel_api sh

db-shell: ## Open interactive MySQL client inside travel_mysql container
	docker compose exec travel_mysql mysql -u traveldb -ptraveldb travel_db

ps: ## View running Docker containers status
	docker compose ps

status: ps ## Alias for 'make ps'

# ------------------------------------------------------------------------------
# 🚀 Docker Production (Uses: docker-compose.prod.yaml)
# ------------------------------------------------------------------------------

prod-up: ## Build and start production stack in background
	docker compose -f docker-compose.prod.yaml up -d --build

prod-down: ## Stop and remove production stack
	docker compose -f docker-compose.prod.yaml down

prod-restart: ## Restart production containers
	docker compose -f docker-compose.prod.yaml restart

prod-logs: ## View live logs from production stack
	docker compose -f docker-compose.prod.yaml logs -f

prod-status: ## View status of production stack containers
	docker compose -f docker-compose.prod.yaml ps

# ------------------------------------------------------------------------------
# 🧹 Clean & Maintenance
# ------------------------------------------------------------------------------

clean-docker: ## Remove containers, networks, and volumes (⚠️ resets DB data)
	docker compose down -v --remove-orphans

# ------------------------------------------------------------------------------
# ❓ Help Command
# ------------------------------------------------------------------------------

help: ## Show available Makefile Docker commands
	@echo "\nTravel API - Docker Makefile Commands:"
	@echo "========================================"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m  make %-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
