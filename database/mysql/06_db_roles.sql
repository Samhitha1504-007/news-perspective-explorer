-- =====================================================================
-- Owner: P2
-- RBAC with MySQL roles. Run once as root, after 01-05.
-- The website has the same two roles as the database:
--   website role (users.role)   MySQL role     MySQL account the API uses
--   admin                       admin_role     npe_admin
--   reader (and not logged in)  reader_role    npe_reader
-- After login, the Next.js API runs every query of an admin on the
-- npe_admin connection and every query of a reader on npe_reader
-- (frontend/lib/server/db.js), so MySQL itself enforces the role.
-- =====================================================================
USE news_perspective_db;

DROP USER IF EXISTS 'npe_admin'@'localhost', 'npe_reader'@'localhost';
DROP ROLE IF EXISTS 'admin_role', 'reader_role';

CREATE ROLE 'admin_role', 'reader_role';

-- ---------------------------------------------------------------- admin
-- Manages all data: articles, terms, users, and can run every procedure.
-- No CREATE / ALTER / DROP: the schema is changed only by root.
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON news_perspective_db.* TO 'admin_role';

-- ---------------------------------------------------------------- reader
-- Reads everything ...
GRANT SELECT ON news_perspective_db.* TO 'reader_role';
-- ... registers, and changes only their own activity rows.
GRANT INSERT                 ON news_perspective_db.users          TO 'reader_role';
GRANT INSERT                 ON news_perspective_db.comments       TO 'reader_role';
GRANT INSERT, UPDATE, DELETE ON news_perspective_db.bookmarks      TO 'reader_role';
GRANT INSERT, UPDATE, DELETE ON news_perspective_db.topic_follows  TO 'reader_role';
GRANT INSERT, UPDATE, DELETE ON news_perspective_db.source_follows TO 'reader_role';
GRANT DELETE                 ON news_perspective_db.label_feedback TO 'reader_role';
-- Only the routines a reader needs (not sp_add_article, sp_change_user_role).
GRANT EXECUTE ON PROCEDURE news_perspective_db.sp_user_feed                 TO 'reader_role';
GRANT EXECUTE ON PROCEDURE news_perspective_db.sp_set_feedback              TO 'reader_role';
GRANT EXECUTE ON PROCEDURE news_perspective_db.sp_topic_perspective_summary TO 'reader_role';
GRANT EXECUTE ON PROCEDURE news_perspective_db.sp_score_article             TO 'reader_role';
-- Deleting a comment only through sp_delete_comment (author or admin only).
GRANT EXECUTE ON PROCEDURE news_perspective_db.sp_delete_comment            TO 'reader_role';
GRANT EXECUTE ON PROCEDURE news_perspective_db.sp_toggle_bookmark           TO 'reader_role';
GRANT EXECUTE ON PROCEDURE news_perspective_db.sp_most_discussed            TO 'reader_role';
GRANT EXECUTE ON FUNCTION  news_perspective_db.fn_reading_time              TO 'reader_role';
GRANT EXECUTE ON FUNCTION  news_perspective_db.fn_article_label             TO 'reader_role';
GRANT EXECUTE ON FUNCTION  news_perspective_db.fn_agreement_pct             TO 'reader_role';
-- A reader can NOT: add/delete articles, edit perspective_terms, change
-- scores or labels (classified_as), or change anyone's role.

-- ------------------------------------------------------------- accounts
CREATE USER 'npe_admin'@'localhost'  IDENTIFIED BY 'admin_pass123';
CREATE USER 'npe_reader'@'localhost' IDENTIFIED BY 'reader_pass123';
GRANT 'admin_role'  TO 'npe_admin'@'localhost';
GRANT 'reader_role' TO 'npe_reader'@'localhost';
SET DEFAULT ROLE ALL TO 'npe_admin'@'localhost', 'npe_reader'@'localhost';

SHOW GRANTS FOR 'npe_admin'@'localhost'  USING 'admin_role';
SHOW GRANTS FOR 'npe_reader'@'localhost' USING 'reader_role';

-- ---------------------------------------------------------------------
-- Viva demo
-- ---------------------------------------------------------------------
-- mysql -u npe_reader -preader_pass123 news_perspective_db
--   SELECT title FROM articles LIMIT 3;                         -- works
--   CALL sp_user_feed(2);                                       -- works
--   DELETE FROM articles WHERE article_id = 1;                  -- ERROR 1142: command denied
--   DELETE FROM comments WHERE comment_id = 1;                  -- ERROR 1142: use sp_delete_comment
--   CALL sp_delete_comment(1, 3);   -- ERROR 'You can only delete your own comments' (not the author)
--   UPDATE classified_as SET score = 99;                        -- ERROR 1142
--   CALL sp_add_article(1,'x','https://x.org',NOW(),NULL,'x','1',@id);  -- ERROR 1370: execute denied
--
-- mysql -u npe_admin -padmin_pass123 news_perspective_db
--   DELETE FROM comments WHERE comment_id = 1;                  -- works
--   DROP TABLE comments;                                        -- ERROR 1142: only root changes the schema
--
-- REVOKE as root, show the effect on the website, then GRANT back:
--   REVOKE DELETE ON news_perspective_db.bookmarks FROM 'reader_role';
--   (a reader's "Remove bookmark" now fails with "Database permission denied")
--   GRANT DELETE ON news_perspective_db.bookmarks TO 'reader_role';
