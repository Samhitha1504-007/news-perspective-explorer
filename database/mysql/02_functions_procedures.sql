-- =====================================================================
-- Stored functions and procedures. All business logic lives here;
-- the Next.js API only calls these and returns the results.
-- Run after 01_schema.sql.
-- =====================================================================
USE news_perspective_db;

DROP FUNCTION  IF EXISTS fn_count_term;
DROP FUNCTION  IF EXISTS fn_article_label;
DROP FUNCTION  IF EXISTS fn_agreement_pct;
DROP PROCEDURE IF EXISTS sp_compute_scores;
DROP PROCEDURE IF EXISTS sp_refresh_labels;
DROP PROCEDURE IF EXISTS sp_score_article;
DROP PROCEDURE IF EXISTS sp_match_term;
DROP PROCEDURE IF EXISTS sp_add_article;
DROP PROCEDURE IF EXISTS sp_change_user_role;
DROP PROCEDURE IF EXISTS sp_delete_comment;
DROP FUNCTION  IF EXISTS fn_reading_time;
DROP PROCEDURE IF EXISTS sp_toggle_bookmark;
DROP PROCEDURE IF EXISTS sp_most_discussed;
DROP PROCEDURE IF EXISTS sp_topic_perspective_summary;
DROP PROCEDURE IF EXISTS sp_user_feed;
DROP PROCEDURE IF EXISTS sp_set_feedback;

DELIMITER $$

-- ---------------------------------------------------------------------
-- P2  fn_count_term: how many times a term appears in a text as a whole
-- word, ignoring case. "progress" does not match inside "progressive".
-- Trick: remove every match, and (length lost) / (term length) = count.
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_count_term(p_text TEXT, p_term VARCHAR(100))
RETURNS INT
DETERMINISTIC NO SQL
BEGIN
    DECLARE v_text TEXT DEFAULT LOWER(p_text);
    RETURN (CHAR_LENGTH(v_text)
            - CHAR_LENGTH(REGEXP_REPLACE(v_text, CONCAT('\\b', p_term, '\\b'), '')))
           DIV CHAR_LENGTH(p_term);
END$$

-- ---------------------------------------------------------------------
-- P2  fn_article_label: the stored label of an article (the category
-- marked is_label in classified_as). NULL if the article is not scored.
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_article_label(p_article_id INT)
RETURNS VARCHAR(10)
READS SQL DATA
BEGIN
    DECLARE v_label VARCHAR(10) DEFAULT NULL;
    SELECT pc.category_name INTO v_label
    FROM classified_as AS ca
    JOIN perspective_categories AS pc ON pc.category_id = ca.category_id
    WHERE ca.article_id = p_article_id AND ca.is_label = TRUE
    LIMIT 1;
    RETURN v_label;
END$$

-- ---------------------------------------------------------------------
-- P2  fn_agreement_pct: % of readers who agree with an article's label.
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_agreement_pct(p_article_id INT)
RETURNS DECIMAL(5,1)
READS SQL DATA
BEGIN
    DECLARE v_pct DECIMAL(5,1) DEFAULT NULL;
    SELECT ROUND(100 * SUM(vote = 'agree') / COUNT(*), 1) INTO v_pct
    FROM label_feedback
    WHERE article_id = p_article_id;
    RETURN v_pct;
END$$

-- ---------------------------------------------------------------------
-- P2  sp_refresh_labels: store the label. For each article, the category
-- with the highest score gets is_label = TRUE, the other two FALSE.
-- Ties: Neutral first, then Positive, then Critical.
-- ROW_NUMBER() is a window function: it numbers the three categories of
-- each article from highest to lowest score; row 1 is the label.
-- p_article_id NULL = every article (used after a term changes).
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_refresh_labels(IN p_article_id INT)
MODIFIES SQL DATA
BEGIN
    UPDATE classified_as AS ca
    JOIN (
        SELECT c.article_id, c.category_id,
               ROW_NUMBER() OVER (
                   PARTITION BY c.article_id
                   ORDER BY c.score DESC,
                            FIELD(pc.category_name, 'Neutral', 'Positive', 'Critical')
               ) AS rn
        FROM classified_as AS c
        JOIN perspective_categories AS pc ON pc.category_id = c.category_id
        WHERE p_article_id IS NULL OR c.article_id = p_article_id
    ) AS ranked
      ON ranked.article_id = ca.article_id AND ranked.category_id = ca.category_id
    SET ca.is_label = (ranked.rn = 1);
END$$

-- ---------------------------------------------------------------------
-- P2  sp_compute_scores: the scoring engine.
--   1. term_matches  <- how often each term occurs in the text
--   2. classified_as <- one row per category: SUM(occurrences x weight)
--   3. is_label      <- the winning category (sp_refresh_labels)
-- The text is passed in, so the article triggers can call this without
-- reading the articles table they fire on.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_compute_scores(IN p_article_id INT, IN p_text TEXT)
MODIFIES SQL DATA
BEGIN
    DELETE FROM term_matches WHERE article_id = p_article_id;

    INSERT INTO term_matches (article_id, term_id, occurrences)
    SELECT p_article_id, m.term_id, m.cnt
    FROM (
        SELECT term_id, fn_count_term(p_text, term) AS cnt
        FROM perspective_terms
    ) AS m
    WHERE m.cnt > 0;

    INSERT INTO classified_as (article_id, category_id, score, scored_at)
    SELECT * FROM (
        SELECT p_article_id AS article_id,
               c.category_id,
               COALESCE(SUM(tm.occurrences * t.weight), 0) AS score,
               NOW() AS scored_at
        FROM perspective_categories AS c
        LEFT JOIN perspective_terms AS t ON t.category_id = c.category_id
        LEFT JOIN term_matches AS tm
               ON tm.term_id = t.term_id AND tm.article_id = p_article_id
        GROUP BY c.category_id
    ) AS src
    ON DUPLICATE KEY UPDATE score = src.score, scored_at = src.scored_at;

    CALL sp_refresh_labels(p_article_id);
END$$

-- ---------------------------------------------------------------------
-- P2  sp_score_article: re-score one article from its stored text.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_score_article(IN p_article_id INT)
MODIFIES SQL DATA
BEGIN
    DECLARE v_text TEXT DEFAULT NULL;
    SELECT content INTO v_text FROM articles WHERE article_id = p_article_id;
    IF v_text IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Article not found';
    END IF;
    CALL sp_compute_scores(p_article_id, v_text);
END$$

-- ---------------------------------------------------------------------
-- P2  sp_match_term: count one term in every article (used by the
-- perspective_terms triggers when a term is added or its text changes).
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_match_term(IN p_term_id INT, IN p_term VARCHAR(100))
MODIFIES SQL DATA
BEGIN
    DELETE FROM term_matches WHERE term_id = p_term_id;
    INSERT INTO term_matches (article_id, term_id, occurrences)
    SELECT m.article_id, p_term_id, m.cnt
    FROM (
        SELECT article_id, fn_count_term(content, p_term) AS cnt
        FROM articles
    ) AS m
    WHERE m.cnt > 0;
END$$

-- ---------------------------------------------------------------------
-- P1  sp_add_article: article + its topic links in ONE transaction.
-- The AFTER INSERT trigger on articles scores it inside the same
-- transaction, so a rollback also removes the scores.
-- p_topic_ids is text such as '1,3' (procedures cannot take arrays).
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_add_article(
    IN  p_source_id     INT,
    IN  p_title         VARCHAR(500),
    IN  p_url           VARCHAR(700),
    IN  p_published_at  DATETIME,
    IN  p_summary       VARCHAR(1000),
    IN  p_content       TEXT,
    IN  p_topic_ids     VARCHAR(255),
    OUT p_article_id    INT
)
MODIFIES SQL DATA
BEGIN
    DECLARE v_expected INT;
    DECLARE v_linked   INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO articles (source_id, title, url, published_at, summary, content)
    VALUES (p_source_id, p_title, p_url, p_published_at, p_summary, p_content);
    SET p_article_id = LAST_INSERT_ID();

    INSERT INTO article_topics (article_id, topic_id)
    SELECT p_article_id, topic_id
    FROM topics
    WHERE FIND_IN_SET(topic_id, p_topic_ids);

    SET v_linked   = ROW_COUNT();
    SET v_expected = 1 + CHAR_LENGTH(p_topic_ids) - CHAR_LENGTH(REPLACE(p_topic_ids, ',', ''));

    IF p_topic_ids IS NULL OR p_topic_ids = '' OR v_linked <> v_expected THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Every topic_id must exist';
    END IF;

    COMMIT;
END$$

-- ---------------------------------------------------------------------
-- P1  sp_change_user_role: the only way to make an admin.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_change_user_role(IN p_email VARCHAR(255), IN p_role VARCHAR(10))
MODIFIES SQL DATA
BEGIN
    IF p_role NOT IN ('admin', 'reader') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role must be admin or reader';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = LOWER(TRIM(p_email))) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No user with that email';
    END IF;
    UPDATE users SET role = p_role WHERE email = LOWER(TRIM(p_email));
    SELECT user_id, name, email, role FROM users WHERE email = LOWER(TRIM(p_email));
END$$

-- ---------------------------------------------------------------------
-- P1  sp_delete_comment: delete a comment. Only its author or an admin
-- may; anyone else gets an error. The reader role has no DELETE right on
-- comments, so a reader can delete a comment only through this check.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_delete_comment(IN p_comment_id INT, IN p_user_id INT)
MODIFIES SQL DATA
BEGIN
    DECLARE v_author INT DEFAULT NULL;
    DECLARE v_role   VARCHAR(10) DEFAULT NULL;

    SELECT user_id INTO v_author FROM comments WHERE comment_id = p_comment_id;
    IF v_author IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comment not found';
    END IF;

    SELECT role INTO v_role FROM users WHERE user_id = p_user_id;
    IF v_author <> p_user_id AND NOT (v_role <=> 'admin') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You can only delete your own comments';
    END IF;

    DELETE FROM comments WHERE comment_id = p_comment_id;
END$$

-- ---------------------------------------------------------------------
-- P1  fn_reading_time: minutes to read an article, at 200 words a minute
-- (at least 1). Words = spaces + 1. Shown on the article page.
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_reading_time(p_article_id INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_words INT DEFAULT 0;
    SELECT CHAR_LENGTH(TRIM(content)) - CHAR_LENGTH(REPLACE(TRIM(content), ' ', '')) + 1
    INTO v_words
    FROM articles WHERE article_id = p_article_id;
    RETURN GREATEST(1, CEIL(v_words / 200));
END$$

-- ---------------------------------------------------------------------
-- P1  sp_toggle_bookmark: the Save button. If the article is already
-- saved, unsave it; otherwise save it. p_saved (OUT) tells the page the
-- new state: 1 = saved, 0 = not saved.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_toggle_bookmark(IN p_user_id INT, IN p_article_id INT, OUT p_saved TINYINT)
MODIFIES SQL DATA
BEGIN
    IF EXISTS (SELECT 1 FROM bookmarks WHERE user_id = p_user_id AND article_id = p_article_id) THEN
        DELETE FROM bookmarks WHERE user_id = p_user_id AND article_id = p_article_id;
        SET p_saved = 0;
    ELSE
        INSERT INTO bookmarks (user_id, article_id) VALUES (p_user_id, p_article_id);
        SET p_saved = 1;
    END IF;
END$$

-- ---------------------------------------------------------------------
-- P1  sp_most_discussed: the "Most discussed" list on the home page.
-- Ranks articles by comments + bookmarks (activity) and returns the top
-- p_limit. Articles with no activity are left out.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_most_discussed(IN p_limit INT)
READS SQL DATA
BEGIN
    SELECT a.article_id, a.title, s.source_name,
           (SELECT COUNT(*) FROM comments  c WHERE c.article_id = a.article_id) AS comments,
           (SELECT COUNT(*) FROM bookmarks b WHERE b.article_id = a.article_id) AS bookmarks
    FROM articles AS a
    JOIN sources  AS s ON s.source_id = a.source_id
    HAVING comments + bookmarks > 0
    ORDER BY comments + bookmarks DESC, a.published_at DESC
    LIMIT p_limit;
END$$

-- ---------------------------------------------------------------------
-- P2  sp_topic_perspective_summary: label counts for a topic through
-- OUT parameters.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_topic_perspective_summary(
    IN  p_topic_id  INT,
    OUT p_positive  INT,
    OUT p_neutral   INT,
    OUT p_critical  INT
)
READS SQL DATA
BEGIN
    SELECT COALESCE(SUM(l.label = 'Positive'), 0),
           COALESCE(SUM(l.label = 'Neutral'), 0),
           COALESCE(SUM(l.label = 'Critical'), 0)
    INTO p_positive, p_neutral, p_critical
    FROM article_topics AS at
    JOIN v_article_labels AS l ON l.article_id = at.article_id
    WHERE at.topic_id = p_topic_id;
END$$

-- ---------------------------------------------------------------------
-- P1  sp_user_feed: articles from the topics and sources a reader
-- follows, newest first, with the reason each one is in the feed.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_user_feed(IN p_user_id INT)
READS SQL DATA
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
    END IF;

    SELECT d.article_id, d.title, d.published_at, d.source_id, d.source_name,
           d.topics, d.label,
           GROUP_CONCAT(DISTINCT f.reason ORDER BY f.reason SEPARATOR ', ') AS reasons
    FROM (
        SELECT at.article_id, CONCAT('Topic: ', t.topic_name) AS reason
        FROM topic_follows AS tf
        JOIN article_topics AS at ON at.topic_id = tf.topic_id
        JOIN topics AS t          ON t.topic_id = tf.topic_id
        WHERE tf.user_id = p_user_id
        UNION
        SELECT a.article_id, CONCAT('Source: ', s.source_name)
        FROM source_follows AS sf
        JOIN articles AS a ON a.source_id = sf.source_id
        JOIN sources  AS s ON s.source_id = sf.source_id
        WHERE sf.user_id = p_user_id
    ) AS f
    JOIN v_article_details AS d ON d.article_id = f.article_id
    GROUP BY d.article_id, d.title, d.published_at, d.source_id, d.source_name, d.topics, d.label
    ORDER BY d.published_at DESC;
END$$

-- ---------------------------------------------------------------------
-- P2  sp_set_feedback: a reader agrees or disagrees with a label.
-- Insert the first time, update after that (upsert).
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_set_feedback(
    IN p_user_id      INT,
    IN p_article_id   INT,
    IN p_vote         VARCHAR(10),
    IN p_suggested    VARCHAR(10)
)
MODIFIES SQL DATA
BEGIN
    DECLARE v_suggested VARCHAR(10) DEFAULT NULL;

    IF p_vote NOT IN ('agree', 'disagree') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vote must be agree or disagree';
    END IF;

    -- A suggestion only makes sense when disagreeing; an agree vote clears it.
    IF p_vote = 'disagree' AND p_suggested IS NOT NULL AND p_suggested <> '' THEN
        IF p_suggested NOT IN ('Positive', 'Neutral', 'Critical') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Suggested label must be Positive, Neutral or Critical';
        END IF;
        IF p_suggested = fn_article_label(p_article_id) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Suggest a label different from the current one';
        END IF;
        SET v_suggested = p_suggested;
    END IF;

    INSERT INTO label_feedback (user_id, article_id, vote, suggested_label)
    VALUES (p_user_id, p_article_id, p_vote, v_suggested)
    ON DUPLICATE KEY UPDATE vote = VALUES(vote),
                            suggested_label = VALUES(suggested_label);
END$$

DELIMITER ;
