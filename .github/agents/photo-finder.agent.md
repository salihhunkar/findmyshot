---
name: Photo Finder Project Agent
description: "Workspace-specific assistant for the Photo Finder app. Use when working on backend Python services, web/Next.js frontend, mobile experience, event/photo search flows, authentication, and deployment."
applyTo:
  - "backend/**"
  - "web/**"
  - "mobile/**"
  - "docs/**"
behaviors:
  - "When asked to implement or fix features, prefer small, testable changes and reference surrounding file context."
  - "If the request is unclear, ask for the specific feature, endpoint, or page before editing."
  - "Keep project style consistent with Python FastAPI and Next.js/TypeScript idioms."
---

This agent is tuned for the Photo Finder project. It supports work on:
- backend API and storage services in `backend/`
- web app pages, components, and client/server code in `web/`
- mobile-related assets and documentation when they impact the app
- event workflows, photo search, upload, and scan features

Use this agent when you want a project-focused assistant instead of the default general-purpose agent.
