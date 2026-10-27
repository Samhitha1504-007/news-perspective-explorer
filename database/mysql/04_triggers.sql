-- =====================================================================
-- Triggers. Run after 03_views.sql.
-- Scores are kept correct automatically: adding or editing an article
-- scores it, and adding, editing or deleting a term updates every
-- affected score in SQL (no application code involved).
-- =====================================================================
USE news_perspective_db;

DROP TRIGGER IF EXISTS trg_articles_before_insert;
DROP TRIGGER IF EXISTS trg_articles_before_update;
DROP TRIGGER IF EXISTS trg_articles_after_insert;
DROP TRIGGER IF EXISTS trg_articles_after_update;
DROP TRIGGER IF EXISTS trg_users_before_insert;
DROP TRIGGER IF EXISTS trg_comments_before_insert;
DROP TRIGGER IF EXISTS trg_terms_before_insert;
DROP TRIGGER IF EXISTS trg_terms_before_update;
DROP TRIGGER IF EXISTS trg_terms_after_insert;
DROP TRIGGER IF EXISTS trg_terms_after_update;
DROP TRIGGER IF EXISTS trg_terms_before_delete;

DELIMITER $$

-- ===================== P1: data cleaning and validation ==============

-- An article cannot be published in the future; tidy the title.
CREATE TRIGGER trg_articles_before_insert
BEFORE INSERT ON articles
FOR EACH ROW
BEGIN
    IF NEW.published_at > NOW() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'published_at cannot be in the future';
    END IF;
    SET NEW.title = TRIM(NEW.title);
END$$

CREATE TRIGGER trg_articles_before_update
BEFORE UPDATE ON articles
FOR EACH ROW
BEGIN
    IF NEW.published_at > NOW() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'published_at cannot be in the future';
    END IF;
    SET NEW.title = TRIM(NEW.title);
END$$

-- Emails are stored lower-case, so UNIQUE(email) ignores case.
CREATE TRIGGER trg_users_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    SET NEW.email = LOWER(TRIM(NEW.email));
    SET NEW.name  = TRIM(NEW.name);
END$$

-- Comments are trimmed; the CHECK constraint then rejects blank ones.
CREATE TRIGGER trg_comments_before_insert
BEFORE INSERT ON comments
FOR EACH ROW
BEGIN
    SET NEW.body = TRIM(NEW.body);
END$$

-- ===================== P2: automatic scoring ==========================

-- A new article is scored as soon as it is inserted.
CREATE TRIGGER trg_articles_after_insert
AFTER INSERT ON articles
FOR EACH ROW
BEGIN
    CALL sp_compute_scores(NEW.article_id, NEW.content);
END$$

-- If an article's text changes, it is re-scored.
CREATE TRIGGER trg_articles_after_update
AFTER UPDATE ON articles
FOR EACH ROW
BEGIN
    IF NOT (NEW.content <=> OLD.content) THEN
        CALL sp_compute_scores(NEW.article_id, NEW.content);
    END IF;
END$$

-- Terms are stored lower-case and trimmed.
CREATE TRIGGER trg_terms_before_insert
BEFORE INSERT ON perspective_terms
FOR EACH ROW
BEGIN
    SET NEW.term = LOWER(TRIM(NEW.term));
END$$

CREATE TRIGGER trg_terms_before_update
BEFORE UPDATE ON perspective_terms
FOR EACH ROW
BEGIN
    SET NEW.term = LOWER(TRIM(NEW.term));
END$$

-- New term: count it in every article, then add
-- occurrences x weight to that category's score.
CREATE TRIGGER trg_terms_after_insert
AFTER INSERT ON perspective_terms
FOR EACH ROW
BEGIN
    CALL sp_match_term(NEW.term_id, NEW.term);

    UPDATE classified_as AS ca
    JOIN term_matches AS tm
      ON tm.article_id = ca.article_id AND tm.term_id = NEW.term_id
    SET ca.score = ca.score + tm.occurrences * NEW.weight,
        ca.scored_at = NOW()
    WHERE ca.category_id = NEW.category_id;

    CALL sp_refresh_labels(NULL);
END$$

-- Edited term (weight, category or text): take away its OLD
-- contribution, re-count it if the text changed, add the NEW one.
CREATE TRIGGER trg_terms_after_update
AFTER UPDATE ON perspective_terms
FOR EACH ROW
BEGIN
    UPDATE classified_as AS ca
    JOIN term_matches AS tm
      ON tm.article_id = ca.article_id AND tm.term_id = OLD.term_id
    SET ca.score = ca.score - tm.occurrences * OLD.weight,
        ca.scored_at = NOW()
    WHERE ca.category_id = OLD.category_id;

    IF NEW.term <> OLD.term THEN
        CALL sp_match_term(NEW.term_id, NEW.term);
    END IF;

    UPDATE classified_as AS ca
    JOIN term_matches AS tm
      ON tm.article_id = ca.article_id AND tm.term_id = NEW.term_id
    SET ca.score = ca.score + tm.occurrences * NEW.weight,
        ca.scored_at = NOW()
    WHERE ca.category_id = NEW.category_id;

    CALL sp_refresh_labels(NULL);
END$$

-- Deleted term: take away its contribution BEFORE the delete, while its
-- term_matches rows still exist (ON DELETE CASCADE removes them after).
CREATE TRIGGER trg_terms_before_delete
BEFORE DELETE ON perspective_terms
FOR EACH ROW
BEGIN
    UPDATE classified_as AS ca
    JOIN term_matches AS tm
      ON tm.article_id = ca.article_id AND tm.term_id = OLD.term_id
    SET ca.score = ca.score - tm.occurrences * OLD.weight,
        ca.scored_at = NOW()
    WHERE ca.category_id = OLD.category_id;

    CALL sp_refresh_labels(NULL);
END$$

DELIMITER ;
