# Unified Proxy Setup

The system is now deployed as:

- `frontend`: one Next.js service
- `backend`: one Express API service

Use [DEPLOY_UNIFIED.md](/d:/Dev/Projects/collab/Stingrays_HRMS/DEPLOY_UNIFIED.md) for the full deployment flow.

Use [proxy/stingrays-hrms-unified.conf](/d:/Dev/Projects/collab/Stingrays_HRMS/proxy/stingrays-hrms-unified.conf) as the Nginx reference configuration.

Proxy routing is simple:

- `/api/*` -> backend
- `/uploads/*` -> backend
- everything else -> frontend
