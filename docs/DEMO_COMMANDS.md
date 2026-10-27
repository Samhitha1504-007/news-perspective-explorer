# Demo commands (keep this open while presenting)

Run everything from the project folder unless a step says `cd frontend`.
Logins: **admin@example.com / admin123**, **reader1@example.com / reader123**.

---

## 0. Fresh reset (night before, or if the data gets messy)

```powershell
mysql -u root -p
```
```sql
source database/mysql/01_schema.sql
source database/mysql/02_functions_procedures.sql
source database/mysql/03_views.sql
source database/mysql/04_triggers.sql
source database/mysql/05_seed_data.sql
source database/mysql/06_db_roles.sql
exit
```
```powershell
mongosh --eval "db.getSiblingDB('news_perspective_db').dropDatabase()"
mongosh database/mongodb/01_collections.js
mongosh database/mongodb/02_indexes.js
cd frontend
npm run seed:mongo
```

## 1. Start the website

```powershell
cd frontend
npm run dev
```
Open http://localhost:3000. (MySQL and MongoDB services must be running.)

---

## 2. Website walkthrough (about 5 minutes)

**As a reader** (reader1@example.com):

1. Home page: topics with article counts. Click **Compare sources** on *Climate Change*:
   the same COP28 deal is Positive at Al Jazeera, Neutral at CNBC, Critical at CBS News.
2. Search `fossil fuels`: FULLTEXT search returns the 3 COP28 articles. Filter by perspective.
3. Open the CBS News COP28 article:
   - **Read the original on CBS News ↗**: real link.
   - Perspective panel: Positive 1.2 / Neutral 0 / Critical 6.5, the matched terms highlighted.
   - **Save**, **Follow source**, **Follow topic** buttons.
   - **Disagree**, suggest *Neutral*: stored through `sp_set_feedback`.
   - Post a comment. Try a comment of only spaces: rejected by a CHECK constraint.
4. **My feed**: articles from followed topics and sources, each with the reason (`sp_user_feed`).
5. **Saved**: the bookmarked article. **History**: articles you viewed (MongoDB).

**As admin** (admin@example.com):

6. **Add article**: fill the form (any real https link, a past date, a topic). Saved by
   `sp_add_article` in one transaction; the trigger labels it immediately.
7. **Terms**: change the weight of `failure` to 3 and save; the response says how many
   articles were re-scored. Open the CBS COP28 article again: Critical is now 8.3.
   Set it back to 1.2.
8. **Stats**: totals, articles per source by label, most saved, most disputed label,
   top searches (MongoDB).
9. Log in as reader and open `/admin/terms`: **Access denied** (403 from the API).

---

## 3. MySQL demos

```powershell
mysql -u root -p news_perspective_db
```

**Show the structure**
```sql
SHOW TABLES;
DESCRIBE classified_as;               -- PK is (article_id, category_id)
SHOW CREATE TABLE label_feedback\G
SHOW TRIGGERS\G
SHOW PROCEDURE STATUS WHERE Db = 'news_perspective_db';
SHOW FUNCTION STATUS  WHERE Db = 'news_perspective_db';
SELECT @@transaction_isolation;      -- REPEATABLE-READ (InnoDB default)
SELECT table_name, engine FROM information_schema.tables WHERE table_schema = 'news_perspective_db';
```

**Scoring, step by step (P2)**
```sql
SELECT * FROM classified_as WHERE article_id = 6;   -- 3 stored scores; is_label = 1 is the label
SELECT * FROM term_matches  WHERE article_id = 6;
SELECT * FROM v_article_labels;
SELECT fn_article_label(6), fn_count_term('A crisis. Another crisis!', 'crisis');
```

**Trigger re-scoring live (P2)**
```sql
SELECT critical FROM v_article_scores WHERE article_id = 6;     -- 6.50
UPDATE perspective_terms SET weight = 3 WHERE term = 'failure';
SELECT critical FROM v_article_scores WHERE article_id = 6;     -- 8.30
UPDATE perspective_terms SET weight = 1.2 WHERE term = 'failure';
```

**Transaction rollback (P1)**: topic 999 does not exist, so nothing is saved.
```sql
CALL sp_add_article(1, 'Rollback test', 'https://example.org/rollback', NOW(),
                    NULL, 'Some text', '1,999', @id);
-- ERROR 1644: Every topic_id must exist
SELECT COUNT(*) FROM articles WHERE url = 'https://example.org/rollback';   -- 0
```

**Procedures with OUT parameters**
```sql
CALL sp_topic_perspective_summary(2, @p, @n, @c);
SELECT @p AS positive, @n AS neutral, @c AS critical;
CALL sp_user_feed(2);
```

**CRUD, ALTER/DROP, viva queries**
```sql
source database/mysql/07_crud_demo.sql
source database/mysql/08_alter_drop_demo.sql
source database/mysql/queries.sql
```

**Constraints** (each one is rejected)
```sql
DELETE FROM sources WHERE source_name = 'CNBC';                                         -- FK RESTRICT
INSERT INTO users (name, email, password_hash) VALUES ('X', 'ADMIN@example.com', 'x');  -- UNIQUE (trigger lower-cases)
INSERT INTO perspective_terms (term, category_id, weight) VALUES ('bad', 1, 0);         -- CHECK weight
INSERT INTO perspective_terms (term, category_id, weight) VALUES ('Bad Word!', 1, 1);   -- CHECK REGEXP
INSERT INTO classified_as (article_id, category_id, score) VALUES (1, 1, 5);            -- duplicate composite PK
INSERT INTO label_feedback (user_id, article_id, vote, suggested_label) VALUES (2, 1, 'agree', 'Positive');  -- CHECK
INSERT INTO articles (source_id, title, url, published_at, content)
VALUES (1, 'x', 'https://x.org', '2099-01-01', 'x');                                    -- trigger: future date
```

**Database roles**
```sql
SHOW GRANTS FOR 'npe_admin'@'localhost'  USING 'admin_role';
SHOW GRANTS FOR 'npe_reader'@'localhost' USING 'reader_role';
exit
```
```powershell
mysql -u npe_reader -preader_pass123 news_perspective_db
```
```sql
SELECT COUNT(*) FROM articles;                 -- works
DELETE FROM articles WHERE article_id = 1;     -- ERROR 1142: reader cannot delete articles
UPDATE classified_as SET score = 99;           -- ERROR 1142: reader cannot change scores
exit
```
```powershell
mysql -u npe_admin -padmin_pass123 news_perspective_db
```
```sql
DELETE FROM comments WHERE comment_id = 1;     -- works
DROP TABLE comments;                           -- ERROR 1142: only root changes the schema
```
The website uses the same roles: an admin's requests run as `npe_admin`, a reader's as
`npe_reader`. As root, `REVOKE DELETE ON news_perspective_db.bookmarks FROM 'reader_role';`
then "Remove bookmark" on the site fails with "Database permission denied"; GRANT it back.

---

## 4. MongoDB demos

```powershell
mongosh news_perspective_db
```
```js
show collections
db.getCollectionInfos({ name: "reading_history" })[0].options.validator   // $jsonSchema
db.article_metadata.getIndexes()
db.article_metadata.findOne({ article_id: 6 })
db.reading_history.find().sort({ timestamp: -1 }).limit(5)
db.search_logs.find().sort({ timestamp: -1 }).limit(5)
```
```powershell
mongosh database/mongodb/03_crud_demo.js
mongosh database/mongodb/aggregations.js
```

---

## 5. If something breaks

| Problem | Fix |
|---|---|
| Website shows "MongoDB is not available" | start the MongoDB service; MySQL pages still work |
| `Access denied for user 'npe_admin'` / `'npe_reader'` | run `06_db_roles.sql` again as root |
| Article page has no scores | `CALL sp_score_article(<id>);` |
| Login fails for demo users | re-run `05_seed_data.sql` (after 01 to 04) |
| Port 3000 busy | `npm run dev -- -p 3001` |
