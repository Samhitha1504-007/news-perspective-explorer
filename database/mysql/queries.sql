-- Viva queries. Each person: 5-6 SQL from own module, including at
-- least one JOIN, one GROUP BY/HAVING and one subquery.
USE news_perspective_db;

-- =========================== P1 =====================================
-- P1-Q1 (JOIN, 4 tables): every article with its source and topic.
-- article_topics is the bridge table for the many-to-many link.
SELECT a.article_id, a.title, s.source_name, t.topic_name
FROM articles AS a
JOIN sources AS s ON s.source_id = a.source_id
JOIN article_topics AS at ON at.article_id = a.article_id
JOIN topics AS t ON t.topic_id = at.topic_id
ORDER BY a.article_id;

-- P1-Q2 (FULLTEXT search): what GET /search runs. MATCH ... AGAINST uses
-- the FULLTEXT index on (title, summary); the score ranks the results.
SELECT article_id, title,
       MATCH(title, summary) AGAINST('election') AS relevance
FROM articles
WHERE MATCH(title, summary) AGAINST('election' IN BOOLEAN MODE)
ORDER BY relevance DESC;

-- P1-Q3 (GROUP BY + HAVING): topics covered by at least 3 articles.
SELECT t.topic_name, COUNT(at.article_id) AS article_count
FROM topics AS t
JOIN article_topics AS at ON at.topic_id = t.topic_id
GROUP BY t.topic_id, t.topic_name
HAVING COUNT(at.article_id) >= 3
ORDER BY article_count DESC;

-- P1-Q4 (subquery): sources that published more articles than the
-- average source.
SELECT s.source_name, COUNT(a.article_id) AS article_count
FROM sources AS s
JOIN articles AS a ON a.source_id = s.source_id
GROUP BY s.source_id, s.source_name
HAVING COUNT(a.article_id) > (
    SELECT AVG(per_source.total)
    FROM (
        SELECT COUNT(*) AS total
        FROM articles
        GROUP BY source_id
    ) AS per_source
);

-- P1-Q5 (LEFT JOIN + IS NULL): topics with no articles yet. An INNER
-- JOIN would hide them; LEFT JOIN keeps them with NULLs.
SELECT t.topic_id, t.topic_name
FROM topics AS t
LEFT JOIN article_topics AS at ON at.topic_id = t.topic_id
WHERE at.article_id IS NULL;

-- P1-Q6 (date filter + aggregate): articles per topic published in a
-- date range, newest first.
SELECT t.topic_name, COUNT(*) AS articles_in_range, MAX(a.published_at) AS latest
FROM articles AS a
JOIN article_topics AS at ON at.article_id = a.article_id
JOIN topics AS t ON t.topic_id = at.topic_id
WHERE a.published_at BETWEEN '2026-10-05' AND '2026-10-10 23:59:59'
GROUP BY t.topic_id, t.topic_name
ORDER BY latest DESC;

-- =========================== P2 =====================================
-- P2-Q1:
