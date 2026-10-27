-- =====================================================================
-- News Perspective Explorer : MySQL schema
-- 7 entity tables + 7 relationship tables. Engine: InnoDB (MySQL 8
-- default), needed for foreign keys, transactions and FULLTEXT.
--
-- Run first. Then 02 (views), 03 (functions + procedures),
-- 04 (triggers), 05 (seed), 06 (database roles).
-- =====================================================================

DROP DATABASE IF EXISTS news_perspective_db;
CREATE DATABASE news_perspective_db;
USE news_perspective_db;

-- =====================================================================
-- ENTITY TABLES
-- =====================================================================

-- P2 : news outlets
CREATE TABLE sources (
    source_id    INT PRIMARY KEY AUTO_INCREMENT,
    source_name  VARCHAR(150) NOT NULL UNIQUE,
    website      VARCHAR(500),
    country      VARCHAR(100),
    description  TEXT
) ENGINE=InnoDB;

-- P1 : website accounts (role is checked by the Next.js API)
CREATE TABLE users (
    user_id        INT PRIMARY KEY AUTO_INCREMENT,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           ENUM('admin','reader') NOT NULL DEFAULT 'reader',
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_email CHECK (email LIKE '%_@_%._%')
) ENGINE=InnoDB;

-- P1 : events / subjects
CREATE TABLE topics (
    topic_id     INT PRIMARY KEY AUTO_INCREMENT,
    topic_name   VARCHAR(150) NOT NULL UNIQUE,
    description  TEXT
) ENGINE=InnoDB;

-- P1 : articles. source_id implements PUBLISHES (SOURCE 1 : N ARTICLE).
-- content is the text that SQL scores (a short summary written by us;
-- url links to the real published article).
CREATE TABLE articles (
    article_id    INT PRIMARY KEY AUTO_INCREMENT,
    source_id     INT NOT NULL,
    title         VARCHAR(500) NOT NULL,
    url           VARCHAR(700) NOT NULL UNIQUE,
    published_at  DATETIME NOT NULL,
    summary       VARCHAR(1000),
    content       TEXT NOT NULL,
    CONSTRAINT chk_articles_url CHECK (url LIKE 'https://%'),
    CONSTRAINT fk_articles_source
        FOREIGN KEY (source_id) REFERENCES sources(source_id)
        ON DELETE RESTRICT,
    FULLTEXT INDEX ft_articles_text (title, summary, content)
) ENGINE=InnoDB;

-- P2 : the three labels
CREATE TABLE perspective_categories (
    category_id    INT PRIMARY KEY AUTO_INCREMENT,
    category_name  ENUM('Positive','Neutral','Critical') NOT NULL UNIQUE,
    description    TEXT
) ENGINE=InnoDB;

-- P2 : indicator words. category_id implements BELONGS_TO (N : 1).
-- Only letters, spaces and hyphens, so a term is always safe to use
-- inside a regular expression.
CREATE TABLE perspective_terms (
    term_id      INT PRIMARY KEY AUTO_INCREMENT,
    term         VARCHAR(100) NOT NULL UNIQUE,
    category_id  INT NOT NULL,
    weight       DECIMAL(5,2) NOT NULL,
    CONSTRAINT chk_terms_weight CHECK (weight > 0 AND weight <= 10),
    CONSTRAINT chk_terms_text   CHECK (REGEXP_LIKE(term, '^[a-z][a-z -]*[a-z]$', 'c')),
    CONSTRAINT fk_terms_category
        FOREIGN KEY (category_id) REFERENCES perspective_categories(category_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- P1 : reader comments. WRITES (USER 1 : N COMMENT) and
-- HAS (ARTICLE 1 : N COMMENT); a comment always has both (total participation).
CREATE TABLE comments (
    comment_id  INT PRIMARY KEY AUTO_INCREMENT,
    article_id  INT NOT NULL,
    user_id     INT NOT NULL,
    body        VARCHAR(1000) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_comments_body CHECK (CHAR_LENGTH(TRIM(body)) > 0),
    CONSTRAINT fk_comments_article
        FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- RELATIONSHIP TABLES (one per M : N relationship)
-- =====================================================================

-- P1 : COVERS  (ARTICLE M : N TOPIC)
CREATE TABLE article_topics (
    article_id  INT NOT NULL,
    topic_id    INT NOT NULL,
    PRIMARY KEY (article_id, topic_id),
    CONSTRAINT fk_at_article FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_at_topic   FOREIGN KEY (topic_id)   REFERENCES topics(topic_id)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- P2 : MATCHES  (ARTICLE M : N PERSPECTIVE_TERM), attribute occurrences.
-- Filled by sp_score_article: how many times each term appears in an article.
CREATE TABLE term_matches (
    article_id   INT NOT NULL,
    term_id      INT NOT NULL,
    occurrences  INT NOT NULL,
    PRIMARY KEY (article_id, term_id),
    CONSTRAINT chk_tm_occurrences CHECK (occurrences > 0),
    CONSTRAINT fk_tm_article FOREIGN KEY (article_id) REFERENCES articles(article_id)       ON DELETE CASCADE,
    CONSTRAINT fk_tm_term    FOREIGN KEY (term_id)    REFERENCES perspective_terms(term_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- P2 : CLASSIFIED_AS  (ARTICLE M : N PERSPECTIVE_CATEGORY), attributes
-- score and is_label. Every scored article has one row per category, so its
-- three scores are stored here. is_label = TRUE on the winning category: the
-- article's perspective label is stored too (kept up to date by sp_refresh_labels).
CREATE TABLE classified_as (
    article_id   INT NOT NULL,
    category_id  INT NOT NULL,
    score        DECIMAL(8,2) NOT NULL DEFAULT 0,
    is_label     BOOLEAN NOT NULL DEFAULT FALSE,
    scored_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, category_id),
    CONSTRAINT chk_ca_score CHECK (score >= 0),
    CONSTRAINT fk_ca_article  FOREIGN KEY (article_id)  REFERENCES articles(article_id)               ON DELETE CASCADE,
    CONSTRAINT fk_ca_category FOREIGN KEY (category_id) REFERENCES perspective_categories(category_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- P1 : BOOKMARKS  (USER M : N ARTICLE), attribute saved_at
CREATE TABLE bookmarks (
    user_id     INT NOT NULL,
    article_id  INT NOT NULL,
    saved_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, article_id),
    CONSTRAINT fk_bm_user    FOREIGN KEY (user_id)    REFERENCES users(user_id)       ON DELETE CASCADE,
    CONSTRAINT fk_bm_article FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- P2 : RATES  (USER M : N ARTICLE), attributes vote, suggested_label, created_at.
-- A reader agrees or disagrees with the label; when disagreeing they may
-- suggest the label they think is right.
CREATE TABLE label_feedback (
    user_id          INT NOT NULL,
    article_id       INT NOT NULL,
    vote             ENUM('agree','disagree') NOT NULL,
    suggested_label  ENUM('Positive','Neutral','Critical') NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, article_id),
    CONSTRAINT chk_lf_suggestion CHECK (vote = 'disagree' OR suggested_label IS NULL),
    CONSTRAINT fk_lf_user    FOREIGN KEY (user_id)    REFERENCES users(user_id)       ON DELETE CASCADE,
    CONSTRAINT fk_lf_article FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- P1 : FOLLOWS_TOPIC  (USER M : N TOPIC)
CREATE TABLE topic_follows (
    user_id      INT NOT NULL,
    topic_id     INT NOT NULL,
    followed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, topic_id),
    CONSTRAINT fk_tf_user  FOREIGN KEY (user_id)  REFERENCES users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_tf_topic FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- P1 : FOLLOWS_SOURCE  (USER M : N SOURCE)
CREATE TABLE source_follows (
    user_id      INT NOT NULL,
    source_id    INT NOT NULL,
    followed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, source_id),
    CONSTRAINT fk_sf_user   FOREIGN KEY (user_id)   REFERENCES users(user_id)     ON DELETE CASCADE,
    CONSTRAINT fk_sf_source FOREIGN KEY (source_id) REFERENCES sources(source_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- INDEXES (FK columns that are not the first column of a primary key,
-- plus columns used for sorting and filtering)
-- =====================================================================
CREATE INDEX idx_articles_source       ON articles(source_id);
CREATE INDEX idx_articles_published    ON articles(published_at);
CREATE INDEX idx_terms_category        ON perspective_terms(category_id);
CREATE INDEX idx_comments_article_time ON comments(article_id, created_at);
CREATE INDEX idx_comments_user         ON comments(user_id);
CREATE INDEX idx_at_topic              ON article_topics(topic_id);
CREATE INDEX idx_tm_term               ON term_matches(term_id);
CREATE INDEX idx_ca_category           ON classified_as(category_id);
CREATE INDEX idx_bm_article            ON bookmarks(article_id);
CREATE INDEX idx_lf_article            ON label_feedback(article_id);
CREATE INDEX idx_tf_topic              ON topic_follows(topic_id);
CREATE INDEX idx_sf_source             ON source_follows(source_id);
