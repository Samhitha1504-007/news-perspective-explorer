-- =====================================================================
-- CRUD demo on MySQL. Creates its own rows and removes them at the end,
-- so it can be run any number of times:
--     source database/mysql/07_crud_demo.sql;
-- =====================================================================
USE news_perspective_db;

-- Clean up in case a previous run stopped half way
DELETE FROM articles WHERE url = 'https://example.org/crud-demo';
DELETE FROM topics   WHERE topic_name = 'Space Exploration';

-- --------------------------------------------------------------- CREATE
INSERT INTO topics (topic_name, description)
VALUES ('Space Exploration', 'Space missions and launches');

-- Through the procedure: article + topic link in one transaction.
-- The insert trigger scores the article straight away.
SET @space = (SELECT topic_id FROM topics WHERE topic_name = 'Space Exploration');
CALL sp_add_article(1, 'Demo: space agency confirms successful launch',
                    'https://example.org/crud-demo', NOW(), 'Created by the CRUD demo',
                    'The agency confirmed a successful launch and reported that the mission is a historic breakthrough.',
                    CAST(@space AS CHAR), @demo);
SELECT @demo AS new_article_id;

SET @reader = (SELECT user_id FROM users WHERE email = 'reader1@example.com');
INSERT INTO comments (article_id, user_id, body) VALUES (@demo, @reader, '  Great launch!  ');
INSERT INTO bookmarks (user_id, article_id) VALUES (@reader, @demo);

-- --------------------------------------------------------------- READ
SELECT * FROM v_article_details WHERE article_id = @demo;
SELECT t.term, pc.category_name, tm.occurrences, t.weight
FROM term_matches tm
JOIN perspective_terms t       ON t.term_id = tm.term_id
JOIN perspective_categories pc ON pc.category_id = t.category_id
WHERE tm.article_id = @demo;
SELECT comment_id, body, CHAR_LENGTH(body) AS len FROM comments WHERE article_id = @demo;  -- trimmed by trigger

-- --------------------------------------------------------------- UPDATE
-- Changing the text re-scores the article (trg_articles_after_update).
UPDATE articles
SET content = 'The launch was a failure and caused damage, a setback for the agency.'
WHERE article_id = @demo;
SELECT article_id, label, positive, neutral, critical FROM v_article_details WHERE article_id = @demo;

UPDATE topics SET description = 'Rockets, satellites and space missions'
WHERE topic_name = 'Space Exploration';

-- --------------------------------------------------------------- DELETE
-- ON DELETE CASCADE removes the article's topic link, scores, matches,
-- comment and bookmark.
SELECT (SELECT COUNT(*) FROM article_topics WHERE article_id = @demo) AS topic_links,
       (SELECT COUNT(*) FROM classified_as  WHERE article_id = @demo) AS score_rows,
       (SELECT COUNT(*) FROM comments       WHERE article_id = @demo) AS comments,
       (SELECT COUNT(*) FROM bookmarks      WHERE article_id = @demo) AS bookmarks;
DELETE FROM articles WHERE article_id = @demo;
SELECT (SELECT COUNT(*) FROM article_topics WHERE article_id = @demo) AS topic_links,
       (SELECT COUNT(*) FROM classified_as  WHERE article_id = @demo) AS score_rows,
       (SELECT COUNT(*) FROM comments       WHERE article_id = @demo) AS comments,
       (SELECT COUNT(*) FROM bookmarks      WHERE article_id = @demo) AS bookmarks;
DELETE FROM topics WHERE topic_name = 'Space Exploration';

-- --------------------------------------------------------------- constraints
-- Run these one at a time; each one is rejected.
--   DELETE FROM sources WHERE source_name = 'CNBC';                                  -- FK RESTRICT
--   INSERT INTO users (name, email, password_hash) VALUES ('X', 'ADMIN@example.com', 'x'); -- UNIQUE after trigger lower-cases it
--   INSERT INTO perspective_terms (term, category_id, weight) VALUES ('bad', 1, 0);     -- CHECK weight > 0
--   INSERT INTO comments (article_id, user_id, body) VALUES (1, 2, '   ');            -- CHECK non-blank
--   INSERT INTO label_feedback (user_id, article_id, vote, suggested_label) VALUES (2, 1, 'agree', 'Positive'); -- CHECK
--   INSERT INTO articles (source_id, title, url, published_at, content) VALUES (1, 'x', 'https://x.org', '2099-01-01', 'x'); -- trigger
