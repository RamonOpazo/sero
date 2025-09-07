# Top-level Makefile for Sero monorepo

.PHONY: install dev-backend dev-frontend dev build-frontend sync-frontend build-static

install:
	cd backend && uv sync --all-groups
	cd frontend && pnpm install

dev-backend:
	cd backend && uv run sero-dev

dev-frontend:
	cd frontend && pnpm dev

dev:
	make -j2 dev-backend dev-frontend

# Build the frontend production bundle into frontend/dist
build-frontend:
	cd frontend && pnpm build

# Copy the built frontend into backend static directory for packaging
sync-frontend:
	rm -rf backend/src/static && mkdir -p backend/src/static
	cp -r frontend/dist/* backend/src/static/

# Convenience: build frontend and sync into backend static
build-static: build-frontend sync-frontend

