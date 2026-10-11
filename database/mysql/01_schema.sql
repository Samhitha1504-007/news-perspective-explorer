-- =====================================================================
-- News Perspective Explorer : MySQL schema (SHARED CONTRACT)
-- Source of truth: "Shared Database & API Contract" doc.
-- Do NOT rename tables/columns without agreeing first.
--
-- Creation order matters:
--   P2 creates `sources` first; P1 creates `users` and `topics` in
--   parallel, then `articles` (FK -> sources).
--
-- ON DELETE rules below are a DRAFT: confirm on Day 1 (checklist item).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS news_perspective_db;
USE news_perspective_db;

-- ---------------------------------------------------------------------
-- P2 : sources
-- ---------------------------------------------------------------------
CREATE TABLE sources (
    source_id    INT PRIMARY KEY AUTO_INCREMENT,
    source_name  VARCHAR(150) UNIQUE NOT NULL,
    website      VARCHAR(500),
    country      VARCHAR(100),
    description  TEXT
);

-- ---------------------------------------------------------------------
-- P1 : users, topics
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id        INT PRIMARY KEY AUTO_INCREMENT,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           ENUM('admin','reader') NOT NULL DEFAULT 'reader',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE topics (
    topic_id     INT PRIMARY KEY AUTO_INCREMENT,
    topic_name   VARCHAR(150) UNIQUE NOT NULL,
    description  TEXT
);

-- ---------------------------------------------------------------------
-- P1 : articles, article_topics
-- ---------------------------------------------------------------------
CREATE TABLE articles (
    article_id    INT PRIMARY KEY AUTO_INCREMENT,
    source_id     INT NOT NULL,
    title         VARCHAR(500) NOT NULL,
    url           VARCHAR(1000),
    published_at  DATETIME,
    summary       TEXT,
    CONSTRAINT fk_articles_source
        FOREIGN KEY (source_id) REFERENCES sources(source_id)
        ON DELETE RESTRICT,
    FULLTEXT INDEX ft_articles_title_summary (title, summary)
);

CREATE TABLE article_topics (
    article_id  INT NOT NULL,
    topic_id    INT NOT NULL,
    PRIMARY KEY (article_id, topic_id),
    CONSTRAINT fk_article_topics_article
        FOREIGN KEY (article_id) REFERENCES articles(article_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_article_topics_topic
        FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
        ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- P2 : perspective_categories, perspective_terms, article_perspectives
-- ---------------------------------------------------------------------
CREATE TABLE perspective_categories (
    category_id    INT PRIMARY KEY AUTO_INCREMENT,
    category_name  ENUM('Positive','Neutral','Critical') UNIQUE NOT NULL,
    description    TEXT
);

CREATE TABLE perspective_terms (
    term_id      INT PRIMARY KEY AUTO_INCREMENT,
    term         VARCHAR(100) UNIQUE NOT NULL,
    category_id  INT NOT NULL,
    weight       DECIMAL(5,2) NOT NULL,
    CONSTRAINT chk_perspective_terms_weight CHECK (weight > 0),
    CONSTRAINT fk_perspective_terms_category
        FOREIGN KEY (category_id) REFERENCES perspective_categories(category_id)
        ON DELETE RESTRICT
);

CREATE TABLE article_perspectives (
    article_id      INT PRIMARY KEY,
    category_id     INT NOT NULL,
    positive_score  DECIMAL(8,2) NOT NULL DEFAULT 0,
    neutral_score   DECIMAL(8,2) NOT NULL DEFAULT 0,
    critical_score  DECIMAL(8,2) NOT NULL DEFAULT 0,
    needs_rescore   BOOLEAN NOT NULL DEFAULT FALSE,
    analyzed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_article_perspectives_scores
        CHECK (positive_score >= 0 AND neutral_score >= 0 AND critical_score >= 0),
    CONSTRAINT fk_article_perspectives_article
        FOREIGN KEY (article_id) REFERENCES articles(article_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_article_perspectives_category
        FOREIGN KEY (category_id) REFERENCES perspective_categories(category_id)
        ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- Indexes for common joins (FK columns not already leading a PK)
-- ---------------------------------------------------------------------
CREATE INDEX idx_articles_source_id        ON articles(source_id);
CREATE INDEX idx_articles_published_at     ON articles(published_at);
CREATE INDEX idx_article_topics_topic_id   ON article_topics(topic_id);
CREATE INDEX idx_perspective_terms_cat     ON perspective_terms(category_id);
CREATE INDEX idx_article_persp_category    ON article_perspectives(category_id);
