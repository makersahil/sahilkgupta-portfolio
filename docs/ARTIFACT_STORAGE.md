# Managed Artifact Storage

Phase 9 adds genuine managed byte storage while retaining truthful external/S3 reference metadata.

Managed bytes are stored outside `public/` and `dist/` under `ARTIFACT_STORAGE_DIR`. The server computes SHA-256 from received bytes, uses a content-addressed key `<prefix>/<sha256>`, creates files with private permissions, and never accepts a client-provided hash as verified evidence.

Uploads require Admin authentication, CSRF protection for browser requests, a shared upload rate limit, `application/octet-stream`, `X-File-Name`, and `X-Artifact-Mime-Type`. Supported signatures are validated for PNG, JPEG, WebP, PDF, ZIP, JSON, and UTF-8 text. Unknown binary types may be stored only as `application/octet-stream` when allowed by the configured size limit.

Private artifacts return not-found behavior to unauthenticated callers. Public managed artifacts are served through `/api/media/:id/content`; the storage path is never exposed. Responses include a content-derived ETag and safe content disposition. Optional read-time verification and explicit Admin integrity verification compare stored bytes with the database hash and size.

Metadata deletion also removes an unreferenced managed object. Artifact rows still referenced by Lab inputs or evidence remain conflict-protected. Backups must include both PostgreSQL metadata and the private artifact directory.

Reference-only artifacts remain labeled `EXTERNAL`, `S3_REFERENCE`, or `REFERENCE`. Registering metadata does not prove upload, reachability, ownership, or checksum validity.
