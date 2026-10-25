-- ALTER / DROP demonstrations for the viva.
USE news_perspective_db;

-- P1: ALTER demo on users. Adds a column, changes it, then removes it,
-- so the table ends exactly as it started and the script can be re-run.
-- DEFAULT '' fills the new column for existing users. Without it they
-- would get NULL and the NOT NULL change below would fail.
ALTER TABLE users ADD COLUMN phone VARCHAR(15) DEFAULT '';
DESCRIBE users;

ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL DEFAULT '';
DESCRIBE users;

ALTER TABLE users DROP COLUMN phone;
DESCRIBE users;

-- ALTER on a constraint: add a rule that a title cannot be blank,
-- show it rejecting a bad row, then remove it again.
ALTER TABLE articles ADD CONSTRAINT chk_articles_title CHECK (TRIM(title) <> '');
-- INSERT INTO articles (source_id, title) VALUES (1, '   ');   -- rejected
ALTER TABLE articles DROP CHECK chk_articles_title;

-- P2: DROP VIEW, show it is gone, then recreate it from 03_views.sql.
-- The data is not lost: a view only stores the query, not rows.
DROP VIEW IF EXISTS v_source_perspective_summary;
-- SELECT * FROM v_source_perspective_summary;   -- error: view does not exist

CREATE VIEW v_source_perspective_summary AS
SELECT
    t.topic_id,
    t.topic_name,
    s.source_id,
    s.source_name,
    COUNT(DISTINCT a.article_id) AS article_count,
    COALESCE(SUM(ap.positive_score), 0) AS positive,
    COALESCE(SUM(ap.neutral_score), 0) AS neutral,
    COALESCE(SUM(ap.critical_score), 0) AS critical
FROM topics AS t
JOIN article_topics AS at ON at.topic_id = t.topic_id
JOIN articles AS a ON a.article_id = at.article_id
JOIN sources AS s ON s.source_id = a.source_id
LEFT JOIN article_perspectives AS ap ON ap.article_id = a.article_id
GROUP BY t.topic_id, t.topic_name, s.source_id, s.source_name;

SELECT COUNT(*) AS rows_in_view FROM v_source_perspective_summary;

-- P2: ALTER on her own table: add a CHECK that weights stay at or below 5,
-- show it rejecting a bad value, then remove it.
ALTER TABLE perspective_terms ADD CONSTRAINT chk_terms_weight_max CHECK (weight <= 5);
-- UPDATE perspective_terms SET weight = 9 WHERE term = 'crisis';   -- rejected
ALTER TABLE perspective_terms DROP CHECK chk_terms_weight_max;
