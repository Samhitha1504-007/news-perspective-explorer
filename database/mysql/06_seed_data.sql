
-- ============================================================
-- News Bias & Perspective Explorer
-- Seed data for MySQL
-- Database: news_perspective_db
-- ============================================================

USE news_perspective_db;

-- ============================================================
-- 1. SHARED: PERSPECTIVE CATEGORIES
-- Exactly three categories as required by the contract.
-- ============================================================

INSERT INTO perspective_categories (category_name, description)
VALUES
    ('Positive', 'Framing dominated by positive indicator terms'),
    ('Neutral',  'Reporting language or no clear dominant framing'),
    ('Critical', 'Framing dominated by critical indicator terms')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);


-- ============================================================
-- 2. P2: NEWS SOURCES
-- ============================================================

INSERT INTO sources
    (source_name, website, country, description)
VALUES
    ('Reuters', 'https://www.reuters.com',
     'United Kingdom', 'International news agency'),
    ('BBC News', 'https://www.bbc.com/news',
     'United Kingdom', 'Public-service news organization'),
    ('Associated Press', 'https://apnews.com',
     'United States', 'Independent news cooperative'),
    ('The Guardian', 'https://www.theguardian.com',
     'United Kingdom', 'News publication'),
    ('Al Jazeera', 'https://www.aljazeera.com',
     'Qatar', 'International news organization')
ON DUPLICATE KEY UPDATE
    website = VALUES(website),
    country = VALUES(country),
    description = VALUES(description);


-- ============================================================
-- 3. P2: PERSPECTIVE TERMS
-- Illustrative terms and weights for demonstrating the scorer.
-- They are not validated measures of actual political bias.
-- ============================================================

INSERT INTO perspective_terms (term, category_id, weight)
SELECT
    t.term,
    c.category_id,
    t.weight
FROM (
    SELECT 'successful' AS term, 'Positive' AS category_name,
           1.00 AS weight
    UNION ALL SELECT 'benefit', 'Positive', 1.00
    UNION ALL SELECT 'improved', 'Positive', 1.20
    UNION ALL SELECT 'progress', 'Positive', 1.00
    UNION ALL SELECT 'opportunity', 'Positive', 1.10

    UNION ALL SELECT 'reported', 'Neutral', 1.00
    UNION ALL SELECT 'announced', 'Neutral', 1.00
    UNION ALL SELECT 'stated', 'Neutral', 1.00
    UNION ALL SELECT 'according to', 'Neutral', 1.00
    UNION ALL SELECT 'confirmed', 'Neutral', 1.00

    UNION ALL SELECT 'crisis', 'Critical', 1.20
    UNION ALL SELECT 'failure', 'Critical', 1.20
    UNION ALL SELECT 'controversy', 'Critical', 1.00
    UNION ALL SELECT 'alleged', 'Critical', 1.00
    UNION ALL SELECT 'damage', 'Critical', 1.10
) AS t
JOIN perspective_categories AS c
    ON c.category_name = t.category_name
ON DUPLICATE KEY UPDATE
    category_id = VALUES(category_id),
    weight = VALUES(weight);


-- ============================================================
-- 4. P1: SAMPLE TOPICS
-- These are shared demo topics; coordinate with Person 1
-- before changing the agreed topic list.
-- ============================================================

INSERT INTO topics (topic_name, description)
VALUES
    ('Climate Change',
     'News about climate policy, emissions, and environmental change'),
    ('Artificial Intelligence',
     'News about AI research, applications, risks, and regulation'),
    ('Economy',
     'News about economic growth, inflation, employment, and policy'),
    ('Public Health',
     'News about healthcare, public health policy, and medical research'),
    ('Elections',
     'News about elections, candidates, campaigns, and voting')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);


-- ============================================================
-- 5. P1: USERS
-- password_hash values are bcrypt hashes made by the backend's
-- hash_password() function. Demo logins:
--   admin@example.com    / admin123   (admin)
--   reader1@example.com  / reader123  (reader)
--   reader2@example.com  / reader123  (reader)
-- ============================================================

INSERT INTO users (name, email, password_hash, role)
VALUES
    ('Admin User', 'admin@example.com',
     '$2b$12$s.7mnEt.vEz8mdtuQxdXEOjFHBynx4t5AXanc1v29eOtnNzgX1xty', 'admin'),
    ('Reader One', 'reader1@example.com',
     '$2b$12$UD2qQlkTxjnnUzGvWR..eeIAYU5E/RxEN4qznPIfqubEvF/tN8h32', 'reader'),
    ('Reader Two', 'reader2@example.com',
     '$2b$12$UD2qQlkTxjnnUzGvWR..eeIAYU5E/RxEN4qznPIfqubEvF/tN8h32', 'reader')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    role = VALUES(role);


-- ============================================================
-- 6. P2: SYNTHETIC DEMO ARTICLES
-- These are fictional examples for testing, not real news.
-- URLs use example.com and are not real article links.
-- ============================================================

INSERT INTO articles
    (source_id, title, url, published_at, summary)
SELECT
    s.source_id,
    d.title,
    d.url,
    d.published_at,
    d.summary
FROM (
    SELECT
        'Reuters' AS source_name,
        'Demo: Renewable energy project reports progress' AS title,
        'https://example.com/demo/renewable-energy-progress' AS url,
        '2026-10-01 09:00:00' AS published_at,
        'Synthetic example describing reported progress and potential benefits of a renewable energy project.' AS summary

    UNION ALL

    SELECT
        'BBC News',
        'Demo: Officials announce a new climate policy',
        'https://example.com/demo/climate-policy',
        '2026-10-02 10:00:00',
        'Synthetic example describing officials announcing a climate policy and its expected effects.'

    UNION ALL

    SELECT
        'Associated Press',
        'Demo: Economic controversy follows policy announcement',
        'https://example.com/demo/economic-controversy',
        '2026-10-03 11:00:00',
        'Synthetic example describing a policy controversy and concerns about possible economic damage.'

    UNION ALL

    SELECT
        'The Guardian',
        'Demo: Researchers report improvements in AI safety',
        'https://example.com/demo/ai-safety',
        '2026-10-04 12:00:00',
        'Synthetic example describing reported progress and improvements in AI safety research.'

    UNION ALL

    SELECT
        'Al Jazeera',
        'Demo: Public health officials discuss a healthcare crisis',
        'https://example.com/demo/healthcare-crisis',
        '2026-10-05 13:00:00',
        'Synthetic example describing officials discussing a healthcare crisis and possible responses.'
) AS d
JOIN sources AS s
    ON s.source_name = d.source_name
WHERE NOT EXISTS (
    SELECT 1
    FROM articles AS existing
    WHERE existing.source_id = s.source_id
      AND existing.title = d.title
);


-- ============================================================
-- 7. P1/P2: LINK DEMO ARTICLES TO TOPICS
-- ============================================================

INSERT INTO article_topics (article_id, topic_id)
SELECT a.article_id, t.topic_id
FROM articles AS a
JOIN topics AS t
    ON (
        a.title = 'Demo: Renewable energy project reports progress'
        AND t.topic_name = 'Climate Change'
    )
    OR (
        a.title = 'Demo: Officials announce a new climate policy'
        AND t.topic_name = 'Climate Change'
    )
    OR (
        a.title = 'Demo: Economic controversy follows policy announcement'
        AND t.topic_name = 'Economy'
    )
    OR (
        a.title = 'Demo: Researchers report improvements in AI safety'
        AND t.topic_name = 'Artificial Intelligence'
    )
    OR (
        a.title = 'Demo: Public health officials discuss a healthcare crisis'
        AND t.topic_name = 'Public Health'
    )
WHERE NOT EXISTS (
    SELECT 1
    FROM article_topics AS existing
    WHERE existing.article_id = a.article_id
      AND existing.topic_id = t.topic_id
);


-- ============================================================
-- 8. P1: SYNTHETIC DEMO ARTICLES
-- More sources per topic so the comparison dashboard has
-- something to compare. Article text lives in MongoDB
-- (database/mongodb/article_content.json).
-- ============================================================

INSERT INTO articles
    (source_id, title, url, published_at, summary)
SELECT
    s.source_id,
    d.title,
    d.url,
    d.published_at,
    d.summary
FROM (
    SELECT
        'Reuters' AS source_name,
        'Demo: Election commission confirms voter turnout figures' AS title,
        'https://example.com/demo/election-turnout' AS url,
        '2026-10-06 09:00:00' AS published_at,
        'Synthetic example reporting official voter turnout figures announced by the election commission.' AS summary

    UNION ALL

    SELECT
        'BBC News',
        'Demo: Candidates debate economic plans before the election',
        'https://example.com/demo/election-debate',
        '2026-10-06 18:00:00',
        'Synthetic example describing a televised election debate focused on jobs and growth.'

    UNION ALL

    SELECT
        'Al Jazeera',
        'Demo: Voting machine controversy raises concerns',
        'https://example.com/demo/voting-machines',
        '2026-10-07 08:30:00',
        'Synthetic example describing alleged voting machine failures and the controversy that followed.'

    UNION ALL

    SELECT
        'Reuters',
        'Demo: Government announces new AI regulation framework',
        'https://example.com/demo/ai-regulation',
        '2026-10-07 11:00:00',
        'Synthetic example reporting a new government framework for regulating artificial intelligence.'

    UNION ALL

    SELECT
        'Associated Press',
        'Demo: AI chatbot failure sparks controversy',
        'https://example.com/demo/ai-chatbot-failure',
        '2026-10-08 14:00:00',
        'Synthetic example describing a public AI chatbot failure and the damage to user trust.'

    UNION ALL

    SELECT
        'Al Jazeera',
        'Demo: AI automation creates opportunity and job worries',
        'https://example.com/demo/ai-automation-jobs',
        '2026-10-09 10:00:00',
        'Synthetic example on how AI automation affects jobs, linking technology and the economy.'

    UNION ALL

    SELECT
        'BBC News',
        'Demo: Inflation falls as economy shows progress',
        'https://example.com/demo/inflation-falls',
        '2026-10-10 09:30:00',
        'Synthetic example reporting lower inflation and improved economic growth figures.'

    UNION ALL

    SELECT
        'The Guardian',
        'Demo: Rising costs deepen household crisis',
        'https://example.com/demo/household-costs',
        '2026-10-11 07:45:00',
        'Synthetic example describing households struggling with rising living costs.'
) AS d
JOIN sources AS s
    ON s.source_name = d.source_name
WHERE NOT EXISTS (
    SELECT 1
    FROM articles AS existing
    WHERE existing.source_id = s.source_id
      AND existing.title = d.title
);


-- ============================================================
-- 9. P1: LINK P1 DEMO ARTICLES TO TOPICS
-- The AI automation article belongs to TWO topics, which shows
-- the many-to-many relationship through article_topics.
-- ============================================================

INSERT INTO article_topics (article_id, topic_id)
SELECT a.article_id, t.topic_id
FROM articles AS a
JOIN (
    SELECT 'Demo: Election commission confirms voter turnout figures' AS title, 'Elections' AS topic_name
    UNION ALL SELECT 'Demo: Candidates debate economic plans before the election', 'Elections'
    UNION ALL SELECT 'Demo: Voting machine controversy raises concerns', 'Elections'
    UNION ALL SELECT 'Demo: Government announces new AI regulation framework', 'Artificial Intelligence'
    UNION ALL SELECT 'Demo: AI chatbot failure sparks controversy', 'Artificial Intelligence'
    UNION ALL SELECT 'Demo: AI automation creates opportunity and job worries', 'Artificial Intelligence'
    UNION ALL SELECT 'Demo: AI automation creates opportunity and job worries', 'Economy'
    UNION ALL SELECT 'Demo: Inflation falls as economy shows progress', 'Economy'
    UNION ALL SELECT 'Demo: Rising costs deepen household crisis', 'Economy'
) AS link
    ON link.title = a.title
JOIN topics AS t
    ON t.topic_name = link.topic_name
WHERE NOT EXISTS (
    SELECT 1
    FROM article_topics AS existing
    WHERE existing.article_id = a.article_id
      AND existing.topic_id = t.topic_id
);


-- ============================================================
-- 10. VERIFICATION
-- ============================================================

SELECT 'Users' AS item, COUNT(*) AS total FROM users
UNION ALL
SELECT 'Sources', COUNT(*) FROM sources
UNION ALL
SELECT 'Perspective terms', COUNT(*) FROM perspective_terms
UNION ALL
SELECT 'Perspective categories', COUNT(*) FROM perspective_categories
UNION ALL
SELECT 'Topics', COUNT(*) FROM topics
UNION ALL
SELECT 'Articles', COUNT(*) FROM articles
UNION ALL
SELECT 'Article-topic links', COUNT(*) FROM article_topics;
