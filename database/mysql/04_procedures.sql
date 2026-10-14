-- Owner: P1
-- sp_add_article: inserts an article and its article_topics rows in ONE
-- transaction. If anything fails (bad source_id, bad topic_id), the whole
-- thing is rolled back, so we never get an article without topics.
-- Used by POST /admin/articles.
--
-- p_topic_ids is a comma-separated list such as '1,3' because MySQL
-- procedures cannot take arrays.

USE news_perspective_db;

DROP PROCEDURE IF EXISTS sp_add_article;

DELIMITER $$

CREATE PROCEDURE sp_add_article(
    IN  p_source_id     INT,
    IN  p_title         VARCHAR(500),
    IN  p_url           VARCHAR(1000),
    IN  p_published_at  DATETIME,
    IN  p_summary       TEXT,
    IN  p_topic_ids     VARCHAR(255),
    OUT p_article_id    INT
)
BEGIN
    DECLARE v_expected_topics INT;
    DECLARE v_linked_topics   INT;

    -- On any error: undo everything, then pass the error to the caller.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Step 1: the article (FK on source_id rejects unknown sources)
    INSERT INTO articles (source_id, title, url, published_at, summary)
    VALUES (p_source_id, p_title, p_url, p_published_at, p_summary);

    SET p_article_id = LAST_INSERT_ID();

    -- Step 2: link the article to every topic in the list
    INSERT INTO article_topics (article_id, topic_id)
    SELECT p_article_id, topic_id
    FROM topics
    WHERE FIND_IN_SET(topic_id, p_topic_ids);

    -- Step 3: every topic in the list must have existed.
    -- Number of ids in the list = number of commas + 1.
    SET v_linked_topics   = ROW_COUNT();
    SET v_expected_topics = 1 + LENGTH(p_topic_ids) - LENGTH(REPLACE(p_topic_ids, ',', ''));

    IF p_topic_ids IS NULL OR p_topic_ids = '' OR v_linked_topics <> v_expected_topics THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Every topic_id must exist';
    END IF;

    COMMIT;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- Viva demo
-- ---------------------------------------------------------------------
-- Success:
--   CALL sp_add_article(1, 'Demo title', NULL, NOW(), 'Demo summary', '1,2', @new_id);
--   SELECT @new_id;
--
-- Rollback (topic 999 does not exist, so the article is NOT kept):
--   CALL sp_add_article(1, 'Should not exist', NULL, NOW(), 'x', '1,999', @new_id);
--   SELECT * FROM articles WHERE title = 'Should not exist';   -- 0 rows
