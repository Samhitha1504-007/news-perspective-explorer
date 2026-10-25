# ER diagrams

Image files for slides: `er-mysql.png` and `er-mongodb.png`.
The `.mmd` files are the Mermaid source. To regenerate the images:
`npx -p @mermaid-js/mermaid-cli mmdc -i docs/er-mysql.mmd -o docs/er-mysql.png -b white -s 2`

## 1. MySQL (relational schema)

How to read the line ends: `||` = exactly one, `o|` = zero or one, `o{` = zero or many.

| Relationship | Type | How it is built |
|---|---|---|
| sources → articles | one-to-many | `articles.source_id` FK, ON DELETE RESTRICT |
| articles ↔ topics | many-to-many | bridge table `article_topics` with a composite PK (article_id, topic_id), ON DELETE CASCADE |
| articles → article_perspectives | one-to-zero-or-one | `article_perspectives.article_id` is both PK and FK |
| perspective_categories → perspective_terms | one-to-many | `perspective_terms.category_id` FK |
| perspective_categories → article_perspectives | one-to-many | `article_perspectives.category_id` FK |
| users | no FK in MySQL | linked to MongoDB collections by `user_id` (diagram 2) |

```mermaid
erDiagram
    sources ||--o{ articles : "publishes"
    articles ||--o{ article_topics : "is tagged with"
    topics ||--o{ article_topics : "groups"
    articles ||--o| article_perspectives : "is scored as"
    perspective_categories ||--o{ article_perspectives : "labels"
    perspective_categories ||--o{ perspective_terms : "contains"

    users {
        int user_id PK
        varchar name
        varchar email UK
        varchar password_hash
        enum role "admin or reader"
        timestamp created_at
    }
    sources {
        int source_id PK
        varchar source_name UK
        varchar website
        varchar country
        text description
    }
    articles {
        int article_id PK
        int source_id FK
        varchar title
        varchar url
        datetime published_at
        text summary
    }
    topics {
        int topic_id PK
        varchar topic_name UK
        text description
    }
    article_topics {
        int article_id PK,FK
        int topic_id PK,FK
    }
    perspective_categories {
        int category_id PK
        enum category_name UK "Positive, Neutral, Critical"
        text description
    }
    perspective_terms {
        int term_id PK
        varchar term UK
        int category_id FK
        decimal weight "CHECK weight > 0"
    }
    article_perspectives {
        int article_id PK,FK
        int category_id FK
        decimal positive_score
        decimal neutral_score
        decimal critical_score
        boolean needs_rescore
        timestamp analyzed_at
    }
```

## 2. How MongoDB links to MySQL

Dashed lines are **logical** links. MongoDB has no foreign keys, so the backend
keeps the ids matching: every document stores the same INT `article_id`,
`user_id` or `topic_id` as the MySQL row. Each document's own key is
MongoDB's `_id`.

Why these are in MongoDB: article text is long and unstructured; keywords
and matched terms are arrays; logs and history are append-only events that
grow fast and need no joins.

```mermaid
erDiagram
    users ||..o{ search_logs : "user_id"
    users ||..o{ reading_history : "user_id"
    users ||..o{ comparison_sessions : "user_id"
    articles ||..o| article_content : "article_id"
    articles ||..o| article_metadata : "article_id"
    articles ||..o| perspective_analysis : "article_id"
    articles ||..o{ reading_history : "article_id"
    topics ||..o{ comparison_sessions : "topic_id"

    users {
        int user_id PK "MySQL"
    }
    articles {
        int article_id PK "MySQL"
    }
    topics {
        int topic_id PK "MySQL"
    }
    article_content {
        objectId _id PK "MongoDB"
        int article_id
        string content
        string source_url
    }
    article_metadata {
        objectId _id PK "MongoDB"
        int article_id
        array keywords
        array entities
        int word_count
        array tags
    }
    search_logs {
        objectId _id PK "MongoDB"
        int user_id
        string query
        int result_count
        date timestamp
    }
    perspective_analysis {
        objectId _id PK "MongoDB"
        int article_id
        string label
        array matched_terms
        object term_weights
        object raw_scores
        date analyzed_at
    }
    reading_history {
        objectId _id PK "MongoDB"
        int user_id
        int article_id
        string event_type
        date timestamp
    }
    comparison_sessions {
        objectId _id PK "MongoDB"
        int user_id
        int topic_id
        array compared_sources
        date timestamp
    }
```
