-- CRUD demo for the presentation: Create, Read, Update, Delete on MySQL.
-- Uses a demo topic and article, and removes them at the end, so it can be
-- run any number of times:   source database/mysql/07_crud_demo.sql;

USE news_perspective_db;

-- Start clean in case a previous run stopped half way
DELETE FROM articles WHERE title = 'Demo: Space agency confirms successful launch';
DELETE FROM topics WHERE topic_name = 'Space Exploration';

-- ------------------------------------------------------------------
-- C = CREATE  (INSERT)
-- ------------------------------------------------------------------
INSERT INTO topics (topic_name, description)
VALUES ('Space Exploration', 'News about space missions');

-- Through the stored procedure: article + topic link in one transaction.
-- The topic id comes from a subquery so we don't have to know it.
SET @space_topic = (SELECT topic_id FROM topics WHERE topic_name = 'Space Exploration');
SET @topic_list = CAST(@space_topic AS CHAR);
CALL sp_add_article(1, 'Demo: Space agency confirms successful launch', NULL, NOW(),
                    'Created during the CRUD demo', @topic_list, @new_article);

-- ------------------------------------------------------------------
-- R = READ  (SELECT)
-- ------------------------------------------------------------------
SELECT topic_id, topic_name, description FROM topics WHERE topic_name = 'Space Exploration';
SELECT * FROM v_article_details WHERE article_id = @new_article;

-- ------------------------------------------------------------------
-- U = UPDATE
-- ------------------------------------------------------------------
UPDATE topics
SET description = 'Rockets, satellites and space missions'
WHERE topic_name = 'Space Exploration';

UPDATE articles SET summary = 'Updated during the CRUD demo' WHERE article_id = @new_article;

SELECT topic_name, description FROM topics WHERE topic_name = 'Space Exploration';
SELECT article_id, title, summary FROM articles WHERE article_id = @new_article;

-- ------------------------------------------------------------------
-- D = DELETE
-- ------------------------------------------------------------------
-- ON DELETE CASCADE: deleting the article also deletes its article_topics row.
SELECT COUNT(*) AS links_before FROM article_topics WHERE article_id = @new_article;
DELETE FROM articles WHERE article_id = @new_article;
SELECT COUNT(*) AS links_after FROM article_topics WHERE article_id = @new_article;

DELETE FROM topics WHERE topic_name = 'Space Exploration';
SELECT COUNT(*) AS space_topics_left FROM topics WHERE topic_name = 'Space Exploration';

-- ------------------------------------------------------------------
-- Constraints in action (run these one at a time to show the errors)
-- ------------------------------------------------------------------
-- ON DELETE RESTRICT: a source that still has articles cannot be deleted
--   DELETE FROM sources WHERE source_name = 'Reuters';
-- UNIQUE: the same email twice
--   INSERT INTO users (name, email, password_hash) VALUES ('X', 'admin@example.com', 'x');
-- CHECK: a weight must be > 0
--   INSERT INTO perspective_terms (term, category_id, weight) VALUES ('bad', 1, -2);
-- FOREIGN KEY: an article for a source that does not exist
--   INSERT INTO articles (source_id, title) VALUES (999, 'No such source');
