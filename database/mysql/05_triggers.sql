
-- Owner: P2
-- Flag stored article analyses when a perspective term changes.
-- Python is responsible for recalculating the scores.

USE news_perspective_db;

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
