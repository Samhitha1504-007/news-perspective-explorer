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

-- P2: DROP VIEW + recreate demo (v_source_perspective_summary)
-- TODO(P2)
