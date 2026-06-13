-- Function default privilege hardening.
-- Future functions in public should not become API-callable by anon/authenticated
-- unless a migration grants EXECUTE explicitly.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
