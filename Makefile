# Top-level Makefile for Sero monorepo

.PHONY: install dev-backend dev-frontend dev

install:
	cd backend && uv sync --all-groups
	cd frontend && pnpm install

dev-backend:
	cd backend && uv run sero-dev

dev-frontend:
	cd frontend && pnpm dev

dev:
	make -j2 dev-backend dev-frontend

