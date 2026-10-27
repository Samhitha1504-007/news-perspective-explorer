-- =====================================================================
-- Viva queries: 6 per person, each showing a different SQL feature.
--     source database/mysql/queries.sql;
-- =====================================================================
USE news_perspective_db;

-- =========================== P1 =====================================

-- P1-Q1 (JOIN through a bridge table): every article with its source
-- and topic. article_topics resolves the M : N COVERS relationship.
SELECT a.article_id, a.title, s.source_name, t.topic_name
FROM articles AS a
JOIN sources AS s         ON s.source_id = a.source_id
JOIN article_topics AS at ON at.article_id = a.article_id
JOIN topics AS t          ON t.topic_id = at.topic_id
ORDER BY t.topic_name, s.source_name;

-- P1-Q2 (FULLTEXT search): what GET /api/search runs. MATCH ... AGAINST
-- uses the FULLTEXT index; the relevance score orders the results.
SELECT article_id, title,
       ROUND(MATCH(title, summary, content) AGAINST('fossil fuels'), 3) AS relevance
FROM articles
WHERE MATCH(title, summary, content) AGAINST('fossil fuels' IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC;

-- P1-Q3 (GROUP BY + HAVING): topics covered by at least 3 sources.
SELECT t.topic_name, COUNT(DISTINCT a.source_id) AS sources, COUNT(*) AS articles
FROM topics AS t
JOIN article_topics AS at ON at.topic_id = t.topic_id
JOIN articles AS a        ON a.article_id = at.article_id
GROUP BY t.topic_id, t.topic_name
HAVING COUNT(DISTINCT a.source_id) >= 3
ORDER BY articles DESC;

-- P1-Q4 (correlated subquery): the most recent article from each source.
-- The inner query runs once per outer row, using a.source_id.
SELECT s.source_name, a.title, a.published_at
FROM articles AS a
JOIN sources AS s ON s.source_id = a.source_id
WHERE a.published_at = (
    SELECT MAX(a2.published_at) FROM articles AS a2 WHERE a2.source_id = a.source_id
)
ORDER BY a.published_at DESC;

-- P1-Q5 (LEFT JOIN ... IS NULL): topics that no reader follows yet.
SELECT t.topic_id, t.topic_name
FROM topics AS t
LEFT JOIN topic_follows AS tf ON tf.topic_id = t.topic_id
WHERE tf.user_id IS NULL;

-- P1-Q6 (CTE + window function): readers ranked by how active they are.
WITH activity AS (
    SELECT u.user_id, u.name,
           (SELECT COUNT(*) FROM comments  c WHERE c.user_id = u.user_id) AS comments,
           (SELECT COUNT(*) FROM bookmarks b WHERE b.user_id = u.user_id) AS bookmarks,
           (SELECT COUNT(*) FROM topic_follows  f WHERE f.user_id = u.user_id)
         + (SELECT COUNT(*) FROM source_follows f WHERE f.user_id = u.user_id) AS follows
    FROM users AS u
    WHERE u.role = 'reader'
)
SELECT name, comments, bookmarks, follows,
       comments + bookmarks + follows AS total,
       RANK() OVER (ORDER BY comments + bookmarks + follows DESC) AS activity_rank
FROM activity;

-- =========================== P2 =====================================

-- P2-Q1 (JOIN + aggregation): why an article got its label: each matched
-- term, how often, its weight and what it added.
SELECT t.term, pc.category_name, tm.occurrences, t.weight,
       tm.occurrences * t.weight AS adds
FROM term_matches AS tm
JOIN perspective_terms AS t       ON t.term_id = tm.term_id
JOIN perspective_categories AS pc ON pc.category_id = t.category_id
WHERE tm.article_id = 6
ORDER BY adds DESC;

-- P2-Q2 (window function RANK with PARTITION BY): within each topic,
-- rank the sources from most to least critical.
SELECT topic_name, source_name, critical,
       RANK() OVER (PARTITION BY topic_id ORDER BY critical DESC) AS most_critical_rank
FROM v_source_perspective_summary
ORDER BY topic_name, most_critical_rank;

-- P2-Q3 (subquery): articles whose critical score is above the average
-- critical score.
SELECT a.title, ca.score AS critical_score
FROM classified_as AS ca
JOIN perspective_categories AS pc ON pc.category_id = ca.category_id
JOIN articles AS a                ON a.article_id = ca.article_id
WHERE pc.category_name = 'Critical'
  AND ca.score > (SELECT AVG(ca2.score)
                  FROM classified_as ca2
                  JOIN perspective_categories pc2 ON pc2.category_id = ca2.category_id
                  WHERE pc2.category_name = 'Critical')
ORDER BY ca.score DESC;

-- P2-Q4 (GROUP BY + HAVING): terms that appear in at least 2 articles.
SELECT t.term, pc.category_name, COUNT(*) AS articles, SUM(tm.occurrences) AS total_occurrences
FROM term_matches AS tm
JOIN perspective_terms AS t       ON t.term_id = tm.term_id
JOIN perspective_categories AS pc ON pc.category_id = t.category_id
GROUP BY t.term_id, t.term, pc.category_name
HAVING COUNT(*) >= 2
ORDER BY articles DESC, total_occurrences DESC;

-- P2-Q5 (NOT EXISTS, correlated): sources that never published an
-- article labelled Critical.
SELECT s.source_name
FROM sources AS s
WHERE NOT EXISTS (
    SELECT 1
    FROM articles AS a
    JOIN v_article_labels AS l ON l.article_id = a.article_id
    WHERE a.source_id = s.source_id AND l.label = 'Critical'
);

-- P2-Q6 (functions inside a query): stored label vs readers' opinion.
SELECT a.title,
       fn_article_label(a.article_id) AS label,
       fb.votes, fb.agreement_pct,
       (SELECT GROUP_CONCAT(DISTINCT lf.suggested_label)
        FROM label_feedback lf
        WHERE lf.article_id = a.article_id) AS readers_suggest
FROM articles AS a
JOIN v_article_feedback AS fb ON fb.article_id = a.article_id
WHERE fb.votes > 0
ORDER BY fb.agreement_pct;
