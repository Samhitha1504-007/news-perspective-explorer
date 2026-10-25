-- Triggers: code that MySQL runs AUTOMATICALLY when a row is inserted,
-- updated or deleted. Nobody calls a trigger; the table change fires it.
--   BEFORE triggers can check or change the NEW row before it is saved.
--   AFTER triggers react once the change has happened.

USE news_perspective_db;

-- =====================================================================
-- P2: perspective terms
-- =====================================================================

-- Flag stored article analyses when a perspective term changes.
-- Python is responsible for recalculating the scores.
DROP TRIGGER IF EXISTS trg_perspective_terms_after_update;

DELIMITER $$

CREATE TRIGGER trg_perspective_terms_after_update
AFTER UPDATE ON perspective_terms
FOR EACH ROW
BEGIN
    UPDATE article_perspectives
    SET needs_rescore = TRUE
    WHERE article_id IN (
        SELECT article_id
        FROM (
            SELECT article_id
            FROM article_perspectives
        ) AS analyzed_articles
    );
END$$

DELIMITER ;

-- Deleting a term changes scores just like editing one, so flag the
-- analyses for re-scoring here too.
DROP TRIGGER IF EXISTS trg_perspective_terms_after_delete;

DELIMITER $$

CREATE TRIGGER trg_perspective_terms_after_delete
AFTER DELETE ON perspective_terms
FOR EACH ROW
BEGIN
    UPDATE article_perspectives
    SET needs_rescore = TRUE;
END$$

DELIMITER ;

-- =====================================================================
-- P1: articles and users
-- =====================================================================

-- Reject an article dated in the future, and trim spaces off its title.
-- Runs on every insert, including the ones made by sp_add_article.
DROP TRIGGER IF EXISTS trg_articles_before_insert;

DELIMITER $$

CREATE TRIGGER trg_articles_before_insert
BEFORE INSERT ON articles
FOR EACH ROW
BEGIN
    IF NEW.published_at > NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'published_at cannot be in the future';
    END IF;

    SET NEW.title = TRIM(NEW.title);
END$$

DELIMITER ;

-- Store emails in lowercase with no spaces, so the UNIQUE rule on
-- users.email treats "A@x.com" and "a@x.com" as the same address.
DROP TRIGGER IF EXISTS trg_users_before_insert;

DELIMITER $$

CREATE TRIGGER trg_users_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    SET NEW.email = LOWER(TRIM(NEW.email));
    SET NEW.name  = TRIM(NEW.name);
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- Viva demo
-- ---------------------------------------------------------------------
-- See them:   SHOW TRIGGERS;
--
-- trg_articles_before_insert (rejected):
--   INSERT INTO articles (source_id, title, published_at) VALUES (1, 'Future', '2099-01-01');
--
-- trg_users_before_insert (email saved as demo@example.com):
--   INSERT INTO users (name, email, password_hash) VALUES ('  Demo ', '  DEMO@Example.COM ', 'x');
--   SELECT name, email FROM users WHERE email = 'demo@example.com';
--   DELETE FROM users WHERE email = 'demo@example.com';
--
-- trg_perspective_terms_after_update (all rows flagged):
--   UPDATE perspective_terms SET weight = 1.30 WHERE term = 'crisis';
--   SELECT article_id, needs_rescore FROM article_perspectives;
