-- =====================================================================
-- Views. Run after 02_functions_procedures.sql.
-- =====================================================================
USE news_perspective_db;

-- P2  The stored label of every scored article: the classified_as row
-- marked is_label (set by sp_refresh_labels).
CREATE OR REPLACE VIEW v_article_labels AS
SELECT ca.article_id, ca.category_id, pc.category_name AS label, ca.score
FROM classified_as AS ca
JOIN perspective_categories AS pc ON pc.category_id = ca.category_id
WHERE ca.is_label = TRUE;

-- P2  One row per article with its three scores side by side (pivot).
CREATE OR REPLACE VIEW v_article_scores AS
SELECT ca.article_id,
       SUM(CASE WHEN pc.category_name = 'Positive' THEN ca.score ELSE 0 END) AS positive,
       SUM(CASE WHEN pc.category_name = 'Neutral'  THEN ca.score ELSE 0 END) AS neutral,
       SUM(CASE WHEN pc.category_name = 'Critical' THEN ca.score ELSE 0 END) AS critical,
       MAX(ca.scored_at) AS scored_at
FROM classified_as AS ca
JOIN perspective_categories AS pc ON pc.category_id = ca.category_id
GROUP BY ca.article_id;

-- P1  One row per article: source, topics, label and scores.
CREATE OR REPLACE VIEW v_article_details AS
SELECT a.article_id, a.title, a.url, a.published_at, a.summary,
       s.source_id, s.source_name,
       (SELECT GROUP_CONCAT(t.topic_name ORDER BY t.topic_name SEPARATOR ', ')
        FROM article_topics AS at JOIN topics AS t ON t.topic_id = at.topic_id
        WHERE at.article_id = a.article_id) AS topics,
       l.label,
       sc.positive, sc.neutral, sc.critical
FROM articles AS a
JOIN sources AS s               ON s.source_id = a.source_id
LEFT JOIN v_article_labels AS l ON l.article_id = a.article_id
LEFT JOIN v_article_scores AS sc ON sc.article_id = a.article_id;

-- P2  Comparison page: per topic and source, article count, total score
-- per category, and how many articles got each label.
CREATE OR REPLACE VIEW v_source_perspective_summary AS
SELECT t.topic_id, t.topic_name, s.source_id, s.source_name,
       COUNT(*)                          AS article_count,
       COALESCE(SUM(sc.positive), 0)     AS positive,
       COALESCE(SUM(sc.neutral), 0)      AS neutral,
       COALESCE(SUM(sc.critical), 0)     AS critical,
       SUM(l.label = 'Positive')         AS positive_articles,
       SUM(l.label = 'Neutral')          AS neutral_articles,
       SUM(l.label = 'Critical')         AS critical_articles
FROM topics AS t
JOIN article_topics AS at       ON at.topic_id = t.topic_id
JOIN articles AS a              ON a.article_id = at.article_id
JOIN sources AS s               ON s.source_id = a.source_id
LEFT JOIN v_article_scores AS sc ON sc.article_id = a.article_id
LEFT JOIN v_article_labels AS l  ON l.article_id = a.article_id
GROUP BY t.topic_id, t.topic_name, s.source_id, s.source_name;

-- P2  Reader feedback per article.
CREATE OR REPLACE VIEW v_article_feedback AS
SELECT a.article_id,
       COUNT(f.user_id)                                AS votes,
       COALESCE(SUM(f.vote = 'agree'), 0)              AS agree_count,
       COALESCE(SUM(f.vote = 'disagree'), 0)           AS disagree_count,
       ROUND(100 * SUM(f.vote = 'agree') / NULLIF(COUNT(f.user_id), 0), 1) AS agreement_pct
FROM articles AS a
LEFT JOIN label_feedback AS f ON f.article_id = a.article_id
GROUP BY a.article_id;
