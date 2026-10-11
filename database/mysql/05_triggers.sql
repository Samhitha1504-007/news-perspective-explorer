-- Owner: P2
-- On UPDATE of perspective_terms, set article_perspectives.needs_rescore
-- = TRUE for affected rows. The Python service does the re-scoring;
-- the trigger only flags.
USE news_perspective_db;

-- TODO(P2): CREATE TRIGGER trg_perspective_terms_after_update ...
