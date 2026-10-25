-- Database roles (least privilege). Run once as root, after 01-06.
-- Website roles (admin/reader) live in users.role and are checked by the
-- backend. These are DATABASE roles: they limit what each MySQL account
-- can do. The backend connects as npe_app instead of root.

USE news_perspective_db;

-- Roles = named groups of privileges
CREATE ROLE IF NOT EXISTS 'npe_app_role', 'npe_readonly_role';

-- The web app can read/change data and CALL procedures,
-- but cannot CREATE, ALTER or DROP anything
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON news_perspective_db.* TO 'npe_app_role';

-- Read-only role, e.g. for someone who only views reports
GRANT SELECT ON news_perspective_db.* TO 'npe_readonly_role';

-- Accounts that use the roles
CREATE USER IF NOT EXISTS 'npe_app'@'localhost' IDENTIFIED BY 'app_pass123';
CREATE USER IF NOT EXISTS 'npe_viewer'@'localhost' IDENTIFIED BY 'viewer123';
GRANT 'npe_app_role' TO 'npe_app'@'localhost';
GRANT 'npe_readonly_role' TO 'npe_viewer'@'localhost';
SET DEFAULT ROLE ALL TO 'npe_app'@'localhost', 'npe_viewer'@'localhost';

SHOW GRANTS FOR 'npe_app'@'localhost' USING 'npe_app_role';

-- ---------------------------------------------------------------------
-- Viva demo
-- ---------------------------------------------------------------------
-- mysql -u npe_viewer -p      (password viewer123)
--   SELECT COUNT(*) FROM news_perspective_db.articles;   -- works
--   DELETE FROM news_perspective_db.articles;            -- ERROR 1142: command denied
--
-- As root, REVOKE and GRANT back:
--   REVOKE DELETE ON news_perspective_db.* FROM 'npe_app_role';
--   SHOW GRANTS FOR 'npe_app'@'localhost' USING 'npe_app_role';   -- DELETE is gone
--   GRANT DELETE ON news_perspective_db.* TO 'npe_app_role';
