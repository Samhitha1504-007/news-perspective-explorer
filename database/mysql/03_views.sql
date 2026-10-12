
-- Owner: P2
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
