# Demo command sheet (keep this open during the presentation)

Run every command from the **project folder** (`news-perspective-explorer`)
unless a step says `cd`. Windows: use `venv\Scripts\activate` and `copy`;
Mac: `source venv/bin/activate` and `cp`.

Demo logins: **admin@example.com / admin123** (admin),
**reader1@example.com / reader123** (reader).

---

## 0. Fresh reset (night before, or if the data gets messy): about 2 minutes

```bash
mysql -u root -p
```
```sql
DROP DATABASE IF EXISTS news_perspective_db;
source database/mysql/01_schema.sql;
source database/mysql/03_views.sql;
source database/mysql/04_procedures.sql;
source database/mysql/05_triggers.sql;
source database/mysql/06_seed_data.sql;
exit;
```
```bash
mongosh --eval 'db.getSiblingDB("news_perspective_db").dropDatabase()'
mongosh database/mongodb/01_collections.js
mongosh database/mongodb/02_indexes.js
mongosh database/mongodb/03_seed.js

cd backend
venv\Scripts\activate            # Mac: source venv/bin/activate
python seed_content.py           # article text -> MongoDB + scores every article
cd ..
```

## 1. Start the app (two terminals, leave both open)

```bash
# Terminal 1: backend (API on http://localhost:8000, docs at /docs)
cd backend
venv\Scripts\activate
uvicorn app:app --reload --port 8000
```
```bash
# Terminal 2: frontend (website on http://localhost:3000)
cd frontend
npm run dev
```

Open two more terminals for the database demos:
**Terminal 3** `mysql -u root -p` then `USE news_perspective_db;`
**Terminal 4** `mongosh` then `use news_perspective_db`

---

## 2. Website walkthrough (5 minutes)

| # | Do this | Point out |
|---|---|---|
| 1 | Open http://localhost:3000 logged out, then click a topic | Guests are sent to login: backend returns 401 |
| 2 | Log in as **reader1** | Token saved; role = reader |
| 3 | Search **AI** | FULLTEXT search, grouped by source, labels |
| 4 | Use the Perspective / Source filters | Filtering in the browser |
| 5 | Open an article | Perspective panel, highlighted words, keywords, related articles |
| 6 | Click "Compare sources on …" | View `v_source_perspective_summary`, stacked bars |
| 7 | Click **History** | MongoDB `reading_history` |
| 8 | Log out, log in as **admin** | Admin links appear |
| 9 | **Add article** (pick 2 topics) | `sp_add_article` transaction, auto-scored |
| 10 | **Terms**: change "crisis" weight to 2, Save | Trigger flags articles → re-scored |
| 11 | **Stats** | MySQL GROUP BY + MongoDB aggregations |
| 12 | Open the new article → **Delete article** | CASCADE in MySQL + delete_many in MongoDB |

---

## 3. MySQL demo (terminal 3)

### Structure
```sql
SHOW TABLES;
DESCRIBE articles;
SHOW CREATE TABLE article_topics\G
SHOW TRIGGERS\G
SHOW PROCEDURE STATUS WHERE Db = 'news_perspective_db';
SHOW FULL TABLES WHERE Table_type = 'VIEW';
```

### CRUD (one script: insert, select, update, delete, cascade)
```sql
source database/mysql/07_crud_demo.sql;
```

### Constraints rejecting bad data (one at a time, each gives an error)
```sql
DELETE FROM sources WHERE source_name = 'Reuters';                                  -- FK RESTRICT
INSERT INTO users (name, email, password_hash) VALUES ('X', 'admin@example.com', 'x'); -- UNIQUE
INSERT INTO perspective_terms (term, category_id, weight) VALUES ('bad', 1, -2);       -- CHECK
INSERT INTO articles (source_id, title) VALUES (999, 'No such source');                -- FK
```

### Triggers
```sql
-- 1. BEFORE INSERT on articles: rejects a future date
INSERT INTO articles (source_id, title, published_at) VALUES (1, 'Future', '2099-01-01');

-- 2. BEFORE INSERT on users: email stored lowercase and trimmed
INSERT INTO users (name, email, password_hash) VALUES ('  Demo ', '  DEMO@Example.COM ', 'x');
SELECT name, email FROM users WHERE email = 'demo@example.com';
DELETE FROM users WHERE email = 'demo@example.com';

-- 3. AFTER UPDATE on perspective_terms: every analysis flagged for re-scoring
UPDATE article_perspectives SET needs_rescore = FALSE;
UPDATE perspective_terms SET weight = 1.30 WHERE term = 'crisis';
SELECT article_id, needs_rescore FROM article_perspectives;
UPDATE perspective_terms SET weight = 1.20 WHERE term = 'crisis';

-- 4. AFTER DELETE on perspective_terms: same flagging
INSERT INTO perspective_terms (term, category_id, weight) VALUES ('demo-term', 1, 1);
UPDATE article_perspectives SET needs_rescore = FALSE;
DELETE FROM perspective_terms WHERE term = 'demo-term';
SELECT SUM(needs_rescore) AS flagged FROM article_perspectives;
```
(After 3 and 4, open any article on the website: `/analyze` re-scores it and
clears the flag. Or edit a term on the Terms page, which re-scores all flagged
articles at once.)

### Stored procedures
```sql
-- sp_add_article: success, then rollback on a bad topic id
CALL sp_add_article(1, 'Procedure demo', NULL, NOW(), 'Demo', '1,2', @new_id);
SELECT @new_id;
SELECT * FROM v_article_details WHERE article_id = @new_id;
CALL sp_add_article(1, 'Should not exist', NULL, NOW(), 'x', '1,999', @bad_id);
SELECT COUNT(*) FROM articles WHERE title = 'Should not exist';   -- 0: rolled back
DELETE FROM articles WHERE title = 'Procedure demo';

-- sp_change_user_role: validation with SIGNAL
CALL sp_change_user_role('reader2@example.com', 'admin');
CALL sp_change_user_role('reader2@example.com', 'reader');
CALL sp_change_user_role('nobody@example.com', 'admin');          -- error
CALL sp_change_user_role('reader2@example.com', 'owner');         -- error

-- sp_topic_perspective_summary: OUT parameters
CALL sp_topic_perspective_summary(2, @pos, @neu, @crit);
SELECT @pos AS positive, @neu AS neutral, @crit AS critical;
```

### Views
```sql
SELECT * FROM v_article_details;
SELECT * FROM v_source_perspective_summary WHERE topic_name = 'Elections';
```

### Viva queries (6 per person) and ALTER / DROP
```sql
source database/mysql/queries.sql;
source database/mysql/02_alter_drop_demo.sql;
```

### Prove the website writes to MySQL
Register a new user on the website, then:
```sql
SELECT user_id, name, email, role, created_at FROM users ORDER BY user_id DESC LIMIT 1;
```

---

## 4. MongoDB demo (terminal 4, inside `mongosh`)

### Structure
```js
use news_perspective_db
show collections
db.getCollectionInfos({ name: "reading_history" })[0].options.validator
db.reading_history.getIndexes()
```

### CRUD (one script). Run it from a normal terminal in the project folder:
```bash
mongosh database/mongodb/04_crud_demo.js
```
Or type the operations live:
```js
// CREATE
db.reading_history.insertOne({ user_id: NumberInt(2), article_id: NumberInt(1), event_type: "demo", timestamp: new Date() })
// READ
db.reading_history.find({ event_type: "demo" })
db.article_content.findOne({ article_id: 1 })
// UPDATE
db.reading_history.updateOne({ event_type: "demo" }, { $set: { article_id: NumberInt(2) } })
// DELETE
db.reading_history.deleteMany({ event_type: "demo" })
// VALIDATION: rejected because user_id and timestamp are missing
db.reading_history.insertOne({ article_id: NumberInt(1), event_type: "demo" })
```

### Aggregations (from `database/mongodb/aggregations.js`)
```js
// Most common keywords ($unwind splits the array)
db.article_metadata.aggregate([{ $unwind: "$keywords" }, { $group: { _id: "$keywords", articles: { $sum: 1 } } }, { $sort: { articles: -1 } }, { $limit: 5 }])

// Articles per label
db.perspective_analysis.aggregate([{ $group: { _id: "$label", articles: { $sum: 1 } } }])

// Most popular searches
db.search_logs.aggregate([{ $group: { _id: { $toLower: "$query" }, times: { $sum: 1 } } }, { $sort: { times: -1 } }])

// Most compared topics and unique users
db.comparison_sessions.aggregate([{ $group: { _id: "$topic_id", comparisons: { $sum: 1 }, users: { $addToSet: "$user_id" } } }, { $project: { comparisons: 1, unique_users: { $size: "$users" } } }])

// Index in use: look for IXSCAN in the winning plan
db.reading_history.find({ user_id: 2 }).sort({ timestamp: -1 }).explain().queryPlanner.winningPlan
```

### Prove the website writes to MongoDB
Search for something on the website, then:
```js
db.search_logs.find().sort({ timestamp: -1 }).limit(1)
```
Open an article, then:
```js
db.reading_history.find().sort({ timestamp: -1 }).limit(1)
```
