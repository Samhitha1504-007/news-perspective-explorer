# Database design

Figures (in this folder):

- `er-diagram.png`: Chen ER diagram of the MySQL design
- `relational-schema.png`: the relations it maps to, with every foreign key
- `mongodb-model.png`: the four MongoDB collections

## 1. Entities

| Entity | Key | Attributes | Table |
|---|---|---|---|
| SOURCE | source_id | source_name, website, country, description | `sources` |
| ARTICLE | article_id | title, url, published_at, summary, content | `articles` |
| TOPIC | topic_id | topic_name, description | `topics` |
| USER | user_id | name, email, password_hash, role, created_at | `users` |
| COMMENT | comment_id | body, created_at | `comments` |
| PERSPECTIVE_CATEGORY | category_id | category_name (Positive / Neutral / Critical), description | `perspective_categories` |
| PERSPECTIVE_TERM | term_id | term, weight | `perspective_terms` |

The perspective of every article is **stored** in `classified_as`: its three scores
(`score`) and its label (`is_label = TRUE` on the winning category, ties going Neutral,
then Positive, then Critical). `sp_refresh_labels` sets `is_label` whenever scores change,
so the label can never disagree with the scores. `v_article_labels` and
`fn_article_label` just read it.

## 2. Relationships

| Relationship | Between | Cardinality | Attributes | How it is stored |
|---|---|---|---|---|
| PUBLISHES | SOURCE – ARTICLE | 1 : N (article total) | | FK `articles.source_id` |
| BELONGS_TO | PERSPECTIVE_TERM – PERSPECTIVE_CATEGORY | N : 1 (term total) | | FK `perspective_terms.category_id` |
| WRITES | USER – COMMENT | 1 : N (comment total) | | FK `comments.user_id` |
| HAS | ARTICLE – COMMENT | 1 : N (comment total) | | FK `comments.article_id` |
| COVERS | ARTICLE – TOPIC | M : N | | table `article_topics` |
| CLASSIFIED_AS | ARTICLE – PERSPECTIVE_CATEGORY | M : N | score, is_label, scored_at | table `classified_as` |
| MATCHES | ARTICLE – PERSPECTIVE_TERM | M : N | occurrences | table `term_matches` |
| BOOKMARKS | USER – ARTICLE | M : N | saved_at | table `bookmarks` |
| RATES | USER – ARTICLE | M : N | vote, suggested_label, created_at | table `label_feedback` |
| FOLLOWS_TOPIC | USER – TOPIC | M : N | followed_at | table `topic_follows` |
| FOLLOWS_SOURCE | USER – SOURCE | M : N | followed_at | table `source_follows` |

## 3. Mapping rules we used

1. Every strong entity became a table with its key as the primary key.
2. Every 1 : N relationship became a foreign key on the N side (no extra table).
3. Every M : N relationship became its own table. Its primary key is the
   **combination of both foreign keys**, and the relationship's attributes are columns
   of that table. So `classified_as` has `PRIMARY KEY (article_id, category_id)`:
   an article has one score per category, three rows per article.
4. Total participation is enforced with `NOT NULL` on the foreign key
   (`articles.source_id`, `perspective_terms.category_id`, `comments.article_id`,
   `comments.user_id`). "Every article has at least one topic" cannot be a column
   constraint, so `sp_add_article` enforces it inside its transaction.

Foreign key actions:

- `ON DELETE RESTRICT`: a source with articles, or a category with terms, cannot be deleted.
- `ON DELETE CASCADE`: deleting an article removes its topic links, scores, term
  matches, comments, bookmarks and feedback; deleting a user removes their comments,
  bookmarks, follows and feedback.

## 4. Attribute types

- **Simple, single-valued:** every MySQL column. All tables are in 3NF: every non-key
  column depends on the whole key and nothing but the key (e.g. `score` depends on
  both `article_id` and `category_id`; `source_name` lives only in `sources`).
- **Stored, computed by SQL:** `score` and `is_label` in `classified_as`. They come
  from the text, but are stored so every page reads them directly; triggers keep them in sync.
- **Multivalued:** `keywords` of an article and `compared_sources` of a comparison
  session. In MySQL these would need their own tables; we keep them as arrays in
  MongoDB, where an array is natural and can be indexed (multikey index).
- **Composite:** none in MySQL. `published_at` is a single DATETIME, not split into parts.

## 5. Constraints enforced by the database

| Constraint | Where |
|---|---|
| PRIMARY KEY, composite PRIMARY KEY | every table; all 7 relationship tables use (fk1, fk2) |
| FOREIGN KEY with RESTRICT / CASCADE | 18 foreign keys |
| UNIQUE | `sources.source_name`, `users.email`, `topics.topic_name`, `articles.url`, `perspective_categories.category_name`, `perspective_terms.term` |
| ENUM | `users.role`, `perspective_categories.category_name`, `label_feedback.vote`, `label_feedback.suggested_label` |
| CHECK | email pattern; url starts with `https://`; `weight` in (0, 10]; term is lower-case letters (REGEXP_LIKE); `occurrences > 0`; `score >= 0`; comment not blank; a suggested label only with a `disagree` vote |
| Triggers | no future `published_at`; emails stored lower-case so UNIQUE ignores case; titles, comments and terms trimmed |
| SIGNAL in procedures | unknown topic id, invalid vote or label, suggesting the label the article already has |

## 6. How an article gets its label (all in SQL)

1. `INSERT INTO articles` fires `trg_articles_after_insert`.
2. It calls `sp_compute_scores(article_id, content)`.
3. That counts every term in the text with `fn_count_term` (whole-word REGEXP match)
   and stores the counts in `term_matches`.
4. Then, for each category, `score = SUM(occurrences × weight)` is upserted into `classified_as`.
5. `sp_refresh_labels` ranks the three rows with `ROW_NUMBER() OVER (PARTITION BY article_id ...)`
   and stores the label: `is_label = TRUE` on the top one, FALSE on the others.
   Adding, editing or deleting a term re-scores and re-labels every article (term triggers).

Worked example, article 6 (CBS News, COP28):

| term | category | occurrences | weight | adds |
|---|---|---|---|---|
| historic | Positive | 1 | 1.2 | 1.2 |
| crisis | Critical | 1 | 1.2 | 1.2 |
| failure | Critical | 1 | 1.2 | 1.2 |
| loopholes | Critical | 1 | 1.1 | 1.1 |
| concerns, criticized, warned | Critical | 1 each | 1.0 | 3.0 |

Positive 1.2, Neutral 0, Critical 6.5, so the label is **Critical**.

When an admin adds, edits or deletes a term, the `perspective_terms` triggers take
away the term's old contribution and add the new one in every affected article,
so scores never go stale.

## 7. MongoDB

| Collection | Owner | One document per | Links to MySQL |
|---|---|---|---|
| `article_metadata` | P1 | article: `keywords[]`, `word_count` | `article_id` (unique index) |
| `search_logs` | P1 | search: `query`, `result_count`, `timestamp` | `user_id` |
| `reading_history` | P2 | article view: `event_type`, `timestamp` | `user_id`, `article_id` |
| `comparison_sessions` | P2 | comparison page visit: `compared_sources[]`, `timestamp` | `user_id`, `topic_id` |

Why MongoDB for these: they are arrays (keywords, compared sources) or high-volume
append-only event logs with no updates and no joins needed. Each collection has a
`$jsonSchema` validator (required fields and types), so bad documents are rejected
by MongoDB itself.

MongoDB cannot take part in a MySQL transaction. When an admin adds an article, the
API saves it in MySQL first, then its keywords in MongoDB; if the MongoDB step fails,
the API deletes the MySQL row again (a compensating action) so the two never disagree.
