
-- Views: saved SELECT queries that behave like read-only tables.
-- SELECT * FROM view_name runs the saved query every time.

-- =====================================================================
-- P2: v_source_perspective_summary
-- =====================================================================
-- v_source_perspective_summary: perspective scores per source per topic.
-- Used by GET /compare/{topic_id}.

USE news_perspective_db;

CREATE OR REPLACE VIEW v_source_perspective_summary AS
SELECT
    t.topic_id,
    t.topic_name,
    s.source_id,
    s.source_name,
    COUNT(DISTINCT a.article_id) AS article_count,
    COALESCE(SUM(ap.positive_score), 0) AS positive,
    COALESCE(SUM(ap.neutral_score), 0) AS neutral,
    COALESCE(SUM(ap.critical_score), 0) AS critical
FROM topics AS t
JOIN article_topics AS at
    ON at.topic_id = t.topic_id
JOIN articles AS a
    ON a.article_id = at.article_id
JOIN sources AS s
    ON s.source_id = a.source_id
LEFT JOIN article_perspectives AS ap
    ON ap.article_id = a.article_id
GROUP BY
    t.topic_id,
    t.topic_name,
    s.source_id,
    s.source_name;


-- =====================================================================
-- P1: v_article_details
-- =====================================================================
-- One row per article with its source, topics and label already joined,
-- so a 5-table JOIN becomes: SELECT * FROM v_article_details;
-- GROUP_CONCAT turns an article's topics into one text field.

CREATE OR REPLACE VIEW v_article_details AS
SELECT
    a.article_id,
    a.title,
    a.published_at,
    s.source_name,
    GROUP_CONCAT(t.topic_name ORDER BY t.topic_name SEPARATOR ', ') AS topics,
    pc.category_name AS label
FROM articles AS a
JOIN sources AS s ON s.source_id = a.source_id
LEFT JOIN article_topics AS at ON at.article_id = a.article_id
LEFT JOIN topics AS t ON t.topic_id = at.topic_id
LEFT JOIN article_perspectives AS ap ON ap.article_id = a.article_id
LEFT JOIN perspective_categories AS pc ON pc.category_id = ap.category_id
GROUP BY a.article_id, a.title, a.published_at, s.source_name, pc.category_name;

-- Viva demo:
--   SELECT * FROM v_article_details;
--   SELECT * FROM v_article_details WHERE label = 'Critical';
