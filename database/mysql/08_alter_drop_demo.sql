-- =====================================================================
-- ALTER and DROP demo. Leaves the schema exactly as it was, so it can be
-- re-run. Run as root.
-- =====================================================================
USE news_perspective_db;

-- P1: ALTER a table: add a column, change it, remove it.
ALTER TABLE users ADD COLUMN phone VARCHAR(15) DEFAULT '';
DESCRIBE users;
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE users DROP COLUMN phone;

-- P1: ALTER a constraint: add a rule, show it working, remove it.
ALTER TABLE comments ADD CONSTRAINT chk_comments_length CHECK (CHAR_LENGTH(body) <= 500);
-- INSERT INTO comments (article_id, user_id, body) VALUES (1, 2, REPEAT('x', 600));  -- rejected
ALTER TABLE comments DROP CHECK chk_comments_length;

-- P2: DROP a view and recreate it.
DROP VIEW IF EXISTS v_article_feedback;
SHOW FULL TABLES WHERE Table_type = 'VIEW';
CREATE VIEW v_article_feedback AS
SELECT a.article_id,
       COUNT(f.user_id)                                AS votes,
       COALESCE(SUM(f.vote = 'agree'), 0)              AS agree_count,
       COALESCE(SUM(f.vote = 'disagree'), 0)           AS disagree_count,
       ROUND(100 * SUM(f.vote = 'agree') / NULLIF(COUNT(f.user_id), 0), 1) AS agreement_pct
FROM articles AS a
LEFT JOIN label_feedback AS f ON f.article_id = a.article_id
GROUP BY a.article_id;
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- P2: ALTER an index: add one, see it, drop it.
CREATE INDEX idx_terms_weight ON perspective_terms(weight);
SHOW INDEX FROM perspective_terms;
DROP INDEX idx_terms_weight ON perspective_terms;
