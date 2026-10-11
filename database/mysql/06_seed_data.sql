-- Seed data. Shared rows first, then each person's half of the topics.
USE news_perspective_db;

-- Shared: exactly these three categories (contract requirement)
INSERT INTO perspective_categories (category_name, description) VALUES
    ('Positive', 'Framing dominated by positive indicator terms'),
    ('Neutral',  'Reporting language or no clear dominant framing'),
    ('Critical', 'Framing dominated by critical indicator terms');

-- P2: sources (4-6), perspective_terms
-- TODO(P2)

-- P1: users (3-5), topics (3-5)
-- TODO(P1)

-- Articles + article_topics: each person seeds the topics they own
-- TODO(P1): articles for P1's topics
-- TODO(P2): articles for P2's topics
