# News Perspective Explorer: presentation guide

Commands for the live demo are in **[DEMO_COMMANDS.md](DEMO_COMMANDS.md)**.
ER diagrams are in **[ER_DIAGRAM.md](ER_DIAGRAM.md)** (`er-mysql.png`, `er-mongodb.png` for slides).

Contents
1. The project in one minute
2. How a request travels (architecture)
3. Who did what
4. Database design
5. List of CRUD operations
6. Triggers: how they work
7. Stored procedures: how they work
8. Views and other SQL features
9. MongoDB: collections, CRUD, indexes, aggregations
10. Next.js frontend
11. FastAPI backend and security
12. The perspective algorithm
13. Doing the 30-minute modification
14. Likely viva questions
15. Troubleshooting

---

## 1. The project in one minute

A user searches for a news event and sees articles about it from several
sources (Reuters, BBC, AP, The Guardian, Al Jazeera). Each article gets a
**rule-based perspective label**: Positive, Neutral or Critical, worked out
by counting weighted indicator words. The comparison page shows how each
source frames the same topic.

It is not a news website and it does not claim to detect bias. The labels
are a transparent word-counting indicator, and the website shows exactly
which words produced each label.

**Stack:** Next.js (frontend) → FastAPI in Python (backend) → MySQL (structured
data) + MongoDB (text, arrays, logs). Both databases are called `news_perspective_db`.

---

## 2. How a request travels (architecture)

```
Browser (Next.js page)
   │  fetch("http://localhost:8000/search?query=AI")   + login token
   ▼
FastAPI backend (Python)
   │  1. checks the token (who is this? reader or admin?)
   │  2. runs SQL with pymysql   → MySQL
   │  3. runs queries with pymongo → MongoDB
   │  4. combines the results into JSON
   ▼
Browser receives JSON and draws the page
```

The browser **never** talks to a database directly. Only the backend
knows the database passwords (from `backend/.env`).

Example: opening an article (`/articles/12`) makes the page call 4 endpoints:
| Call | Database work |
|---|---|
| `GET /articles/12` | MySQL: article + source (JOIN) + topics; MongoDB: full text from `article_content` |
| `GET /analyze/12` | MySQL: load `perspective_terms`; score; upsert `article_perspectives`; MongoDB: upsert `perspective_analysis` |
| `GET /keywords/12` | MongoDB: `article_metadata.keywords` |
| `GET /articles/12/related` | MySQL: self-join on `article_topics` |
| `POST /history` | MongoDB: insert into `reading_history` |

---

## 3. Who did what

| | Person 1 (Samhitha): search, articles, users | Person 2 (Samika): perspective, comparison, history |
|---|---|---|
| MySQL tables | users, topics, articles, article_topics | sources, perspective_categories, perspective_terms, article_perspectives |
| MongoDB | article_content, article_metadata, search_logs | perspective_analysis, reading_history, comparison_sessions |
| Triggers | trg_articles_before_insert, trg_users_before_insert | trg_perspective_terms_after_update, trg_perspective_terms_after_delete |
| Procedures | sp_add_article (transaction), sp_change_user_role | sp_topic_perspective_summary (OUT parameters) |
| Views | v_article_details | v_source_perspective_summary |
| Other SQL | FULLTEXT search, ALTER demo | DROP VIEW / recreate demo |
| Backend | auth, topics, search, articles, admin articles, admin stats | sources, analyze, compare, history, admin terms |
| Frontend | login, register, home, search, article page, add article, stats | comparison dashboard, history, terms admin |
| Viva queries | 6 SQL (P1-Q1..Q6) + 3 MongoDB | 6 SQL (P2-Q1..Q6) + 4 MongoDB |

---

## 4. Database design

### MySQL: 8 tables (structured data with relationships)
| Table | What it stores | Key points |
|---|---|---|
| users | accounts | `email` UNIQUE, `role` ENUM('admin','reader'), bcrypt `password_hash` |
| sources | news outlets | `source_name` UNIQUE |
| topics | events / subjects | `topic_name` UNIQUE |
| articles | article metadata | FK `source_id` → sources (ON DELETE RESTRICT); FULLTEXT(title, summary) |
| article_topics | which article is about which topic | **bridge table** for many-to-many; composite PK (article_id, topic_id); CASCADE |
| perspective_categories | Positive / Neutral / Critical | lookup table, exactly 3 rows |
| perspective_terms | indicator words and weights | FK → categories; `CHECK (weight > 0)` |
| article_perspectives | each article's current scores and label | `article_id` is PK **and** FK (one-to-one); `needs_rescore` flag set by triggers |

**Normalisation (3NF):** no repeated groups (topics are in a bridge table, not
a comma list); category names live once in `perspective_categories` and are
referenced by id; every non-key column depends only on its table's key.

**ON DELETE rules:** deleting an article CASCADES to its `article_topics` and
`article_perspectives` rows (they mean nothing without the article).
Deleting a source or category is RESTRICTED while rows still use it.

### MongoDB: 6 collections (flexible documents)
| Collection | Why MongoDB and not MySQL |
|---|---|
| article_content | long free text |
| article_metadata | arrays (keywords, entities, tags) |
| perspective_analysis | nested data: array of matched-term objects, score object |
| search_logs, reading_history, comparison_sessions | append-only event logs that grow fast and are never joined |

**Link between the two:** every MongoDB document stores the same integer
`article_id` / `user_id` / `topic_id` as the MySQL row. MongoDB has no foreign
keys, so the backend keeps them consistent (for example, deleting an article
also runs `delete_many` on its MongoDB documents).

**Validation in MongoDB:** `01_collections.js` creates each collection with a
`$jsonSchema` validator: required fields and types (ids must be int, `label`
must be Positive/Neutral/Critical). A bad document is rejected.

---

## 5. List of CRUD operations

### MySQL, done through the website
| | Table | Website action | Endpoint | SQL |
|---|---|---|---|---|
| **C** | users | Register | `POST /register` | `INSERT INTO users …` |
| **R** | users | Login | `POST /login` | `SELECT … FROM users WHERE email = %s` |
| **C** | articles + article_topics | Admin → Add article | `POST /admin/articles` | `CALL sp_add_article(…)` (transaction) |
| **R** | articles, sources, topics | Search | `GET /search` | `MATCH … AGAINST` + JOINs |
| **R** | articles, sources, topics | Open article | `GET /articles/{id}` | JOIN articles + sources, topics via article_topics |
| **R** | article_topics (self-join) | Related articles | `GET /articles/{id}/related` | `article_topics` joined to itself |
| **D** | articles (+ CASCADE) | Admin → Delete article | `DELETE /admin/articles/{id}` | `DELETE FROM articles …` |
| **R** | topics | Home page | `GET /topics` | `SELECT … FROM topics` |
| **R** | sources | Add-article form | `GET /sources` | `SELECT … FROM sources` |
| **C** | perspective_terms | Terms → Add | `POST /admin/terms` | `INSERT INTO perspective_terms …` |
| **R** | perspective_terms | Terms page | `GET /admin/terms` | `SELECT` + JOIN categories |
| **U** | perspective_terms | Terms → Save | `PUT /admin/terms/{id}` | `UPDATE perspective_terms …` → **trigger** |
| **D** | perspective_terms | Terms → Delete | `DELETE /admin/terms/{id}` | `DELETE FROM perspective_terms …` → **trigger** |
| **C/U** | article_perspectives | Opening an article (scoring) | `GET /analyze/{id}` | `INSERT … ON DUPLICATE KEY UPDATE` (upsert) |
| **R** | view | Comparison page | `GET /compare/{id}` | `SELECT … FROM v_source_perspective_summary` |
| **R** | several | Admin → Stats | `GET /admin/stats` | scalar subqueries, GROUP BY, LEFT JOIN |

### MongoDB, done through the website
| | Collection | Website action | pymongo call |
|---|---|---|---|
| **C/U** | article_content, article_metadata | Add article / seed | `update_one(…, upsert=True)` |
| **R** | article_content | Open article | `find_one({"article_id": id})` |
| **R** | article_metadata | Keywords on article page | `find_one(…)` |
| **C/U** | perspective_analysis | Opening an article | `update_one(…, upsert=True)` |
| **C** | search_logs | Every search | `insert_one(…)` |
| **C** | reading_history | Opening an article | `insert_one(…)` |
| **R** | reading_history | History page | `find({"user_id": id}).sort("timestamp", -1)` |
| **C** | comparison_sessions | Comparison page | `insert_one(…)` |
| **R** | search_logs, reading_history | Admin → Stats | `aggregate([$group, $sort, $limit])` |
| **D** | all article collections + reading_history | Admin → Delete article | `delete_many({"article_id": id})` |

### Standalone demo scripts
- MySQL: `database/mysql/07_crud_demo.sql` (INSERT, SELECT, UPDATE, DELETE + CASCADE)
- MongoDB: `database/mongodb/04_crud_demo.js` (insertOne/Many, find/findOne, updateOne/Many, deleteOne/Many, validation)

---

## 6. Triggers: how they work

A trigger is SQL that MySQL runs **by itself** when a row is inserted, updated
or deleted. Nobody calls it.
- `BEFORE` triggers run before the row is saved: they can **change** `NEW`
  values or **reject** the row with `SIGNAL SQLSTATE '45000'`.
- `AFTER` triggers run after the change: they react, usually by updating
  another table.
- `NEW` = the row being inserted/updated; `OLD` = the row before update/delete.

| Trigger | Fires | What it does | Why |
|---|---|---|---|
| `trg_articles_before_insert` (P1) | BEFORE INSERT on articles | `IF NEW.published_at > NOW() THEN SIGNAL …`; `SET NEW.title = TRIM(NEW.title)` | A news article cannot be from the future; enforced in the database so no app or script can bypass it. Also fires inside `sp_add_article`, which then rolls back. |
| `trg_users_before_insert` (P1) | BEFORE INSERT on users | `SET NEW.email = LOWER(TRIM(NEW.email))` | Makes the UNIQUE rule case-insensitive: `ADMIN@example.com` counts as a duplicate of `admin@example.com`. |
| `trg_perspective_terms_after_update` (P2) | AFTER UPDATE on perspective_terms | `UPDATE article_perspectives SET needs_rescore = TRUE` | Changing a word's weight makes stored scores out of date. |
| `trg_perspective_terms_after_delete` (P2) | AFTER DELETE on perspective_terms | same flagging | Deleting a word also changes scores. |

**The re-scoring flow (good to explain step by step):**
1. Admin edits "crisis" from 1.2 to 2.0 on the Terms page.
2. Backend runs `UPDATE perspective_terms …`.
3. MySQL fires `trg_perspective_terms_after_update`: every `article_perspectives` row gets `needs_rescore = TRUE`.
4. Backend selects the flagged rows and runs the Python scorer on each.
5. The scorer saves new scores with `needs_rescore = FALSE`.

A trigger cannot run Python, so the database **flags** and the application **recalculates**.

---

## 7. Stored procedures: how they work

A procedure is named SQL saved inside MySQL, run with `CALL name(…)`.
`IN` parameters go in; `OUT` parameters come back in session variables like `@x`.

### `sp_add_article` (P1): transaction with rollback
Used by Admin → Add article.
```
START TRANSACTION
  1. INSERT INTO articles …                 (FK rejects a bad source_id;
                                             trigger rejects a future date)
  2. SET p_article_id = LAST_INSERT_ID()
  3. INSERT INTO article_topics SELECT … FROM topics WHERE FIND_IN_SET(topic_id, p_topic_ids)
  4. IF linked topics ≠ topics asked for → SIGNAL 'Every topic_id must exist'
COMMIT
EXIT HANDLER FOR SQLEXCEPTION → ROLLBACK; RESIGNAL
```
- **Atomic:** either the article and all its topic links are saved, or nothing is.
- Topic ids arrive as text `'1,3'` because MySQL procedures can't take arrays.
  The expected count is `commas + 1`.
- After the procedure, the backend saves the text to MongoDB. MySQL and MongoDB
  can't share one transaction, so if MongoDB fails the backend deletes the
  MySQL row itself (a "compensating action").

### `sp_change_user_role` (P1): validation
`CALL sp_change_user_role('reader2@example.com', 'admin');` checks the role is
`admin` or `reader` and that the user exists (`SIGNAL` with a clear message
otherwise), updates the role, and shows the user. Registration always creates
readers, so this is how an admin is made.

### `sp_topic_perspective_summary` (P2): OUT parameters
```sql
CALL sp_topic_perspective_summary(2, @pos, @neu, @crit);
SELECT @pos, @neu, @crit;
```
`SELECT … INTO p_positive, p_neutral, p_critical` puts three counts into the OUT
parameters. `SUM(category_name = 'Positive')` counts matches, because a true
comparison is 1 and false is 0.

---

## 8. Views and other SQL features

| Feature | Where | Explanation |
|---|---|---|
| View `v_source_perspective_summary` (P2) | `/compare` reads it | score totals per source per topic: 4-table JOIN + GROUP BY saved as a virtual table |
| View `v_article_details` (P1) | demos and queries | one row per article with source, topics (`GROUP_CONCAT`) and label |
| FULLTEXT search (P1) | `/search` | `MATCH(title, summary) AGAINST(…)` uses the FULLTEXT index; the relevance score ranks results. Words under 3 letters (e.g. "AI") are not indexed, so a whole-word `REGEXP '\bAI\b'` catches them. |
| Self-join | `/articles/{id}/related` | `article_topics AS mine JOIN article_topics AS other ON other.topic_id = mine.topic_id` |
| Upsert | `/analyze` | `INSERT … ON DUPLICATE KEY UPDATE` inserts the first time, updates afterwards |
| Constraints | schema | PK, FK (RESTRICT/CASCADE), UNIQUE, NOT NULL, CHECK, ENUM, DEFAULT |
| ALTER / DROP | `02_alter_drop_demo.sql` | add/modify/drop a column; add/drop a CHECK; DROP VIEW and recreate |
| Indexes | `01_schema.sql` | on FK columns used in JOINs, `published_at` for date filters, FULLTEXT |
| Viva queries | `queries.sql` | 12 queries: JOIN, FULLTEXT, GROUP BY/HAVING, subquery, LEFT JOIN/IS NULL, date range, view, CASE, NOT EXISTS |

---

## 9. MongoDB: collections, CRUD, indexes, aggregations

**Documents** are JSON-like objects. Each has its own `_id`. Arrays and nested
objects are normal (e.g. `matched_terms: [{term, category, count, weight}, …]`).

**CRUD commands** (mongosh): `insertOne/insertMany`, `find/findOne` (with a
filter and a projection), `updateOne/updateMany` with `$set`,
`deleteOne/deleteMany`, `countDocuments`. pymongo uses the same names with
underscores: `insert_one`, `find_one`, `update_one`, `delete_many`.

**Upsert:** `update_one(filter, {"$set": …}, upsert=True)` updates the matching
document, or inserts it if there is none. Re-running the seed or re-scoring
never creates duplicates.

**Indexes** (`02_indexes.js`), each with a reason:
- `article_id` unique on the article collections: one document per article, fast lookup
- `{user_id: 1, timestamp: -1}` on history and search logs: one index serves "this user's newest first"
- `keywords` (multikey index on an array), `label`, `topic_id`

**Aggregation pipeline:** documents flow through stages in order.
- `$match` filters, `$group` groups and computes (`$sum`, `$avg`, `$max`, `$addToSet`)
- `$sort`, `$limit`, `$project` reshapes fields, `$unwind` turns one document with an array into one document per element

Example (most common keywords):
`$unwind keywords` → `$group by keyword, count` → `$sort by count` → `$limit 10`.

---

## 10. Next.js frontend

**What Next.js is:** a React framework. React builds the page from components;
Next.js adds routing (folders become URLs) and the build tooling.

**Folders become URLs (App Router):**
| File | URL |
|---|---|
| `app/page.js` | `/` |
| `app/search/page.js` | `/search?query=…` |
| `app/articles/[article_id]/page.js` | `/articles/12`. The `[article_id]` folder is a URL parameter. |
| `app/compare/[topic_id]/page.js` | `/compare/2` |
| `app/admin/terms/page.js` | `/admin/terms` |
| `app/layout.js` | wraps every page (nav bar + footer) |

**How a page gets its data** (every page follows this pattern):
```js
"use client";                                   // runs in the browser
const [article, setArticle] = useState(null);   // a value the page remembers
useEffect(() => {                               // runs once when the page opens
  getArticle(articleId).then(setArticle);       // call the backend, save the result
}, [articleId]);
if (!article) return <p>Loading...</p>;          // first render
return <h1>{article.title}</h1>;                 // re-renders when data arrives
```

**Other pieces**
- `lib/api.js`: every backend call in one file. It adds the login token to each request and, on a 401, sends the user to `/login?next=…`.
- Login session: `{token, user_id, name, role}` is kept in the browser's `localStorage`.
- `components/`: reusable parts: `NavBar`, `SearchBar`, `ArticleCard`, `PerspectivePanel`, `HighlightedText`.
- `app/globals.css`: one stylesheet. Colours are variables at the top (`--accent`, `--positive`, …).
- Commands: `npm run dev` (development, reloads on save), `npm run build` (checks the whole app compiles).

---

## 11. FastAPI backend and security

- `backend/app.py` creates the app and includes one **router** per file in `routes/`.
- `services/` holds logic shared between routes (auth, scoring, keyword extraction).
- `db/mysql.py` and `db/mongo.py` open connections using settings from `.env`.
- Request bodies are checked by **Pydantic** models (types, lengths, required fields) before any SQL runs.
- http://localhost:8000/docs lists every endpoint with a "Try it out" button (click **Authorize** and paste a token from `/login`).

**Security**
| Concern | How it's handled |
|---|---|
| Passwords | bcrypt hash only (`$2b$12$…`). The real password is never stored and can't be recovered. |
| Login | `/login` returns a signed JWT token with `user_id`, `role`, expiry 24h |
| Who is calling | `get_current_user` reads the token; no or bad token → **401** |
| Admin only | `require_admin` → **403** for readers |
| Whole files protected | `router = APIRouter(dependencies=[Depends(get_current_user)])` |
| Own data only | history routes compare the token's `user_id` with the requested one |
| Database account | the backend connects as `npe_app`, not root. Its role (`npe_app_role`) has SELECT/INSERT/UPDATE/DELETE/EXECUTE only, so it cannot DROP or ALTER tables. `npe_readonly_role` is SELECT only. See `08_db_roles.sql` |
| SQL injection | always parameterised: `cursor.execute("… WHERE email = %s", (email,))`, never string-joined |
| Same error for wrong email or password | doesn't reveal which emails exist |
| Registration | always creates `reader`; admins come from seed data or `sp_change_user_role` |

---

## 12. The perspective algorithm

1. Load all terms with their weights and categories from MySQL (`perspective_terms` JOIN `perspective_categories`).
2. Count whole-word matches in the article text: `(?<!\w)term(?!\w)`, ignoring case. "progress" does not match "progressive".
3. Each category's score = Σ (count × weight).
4. Label = the highest score. **Ties go to Neutral**, as does an article with no matches.
5. Save the scores in MySQL `article_perspectives` and the details (matched words, weights) in MongoDB `perspective_analysis`.

The article page shows the table of matched words and highlights them in the
text, so every label can be explained. Admins tune it on the Terms page.

---

## 13. Doing the 30-minute modification

**What reloads by itself:** the backend (`uvicorn --reload`) and the frontend
(`npm run dev`) pick up saved files automatically. SQL changes take effect as
soon as you run them in `mysql`. If you add a new SQL object, also put it in
the right `.sql` file so a fresh setup has it.

**General recipe:** database change → backend route → `lib/api.js` → page.
Test each layer as you go: SQL in `mysql`, the endpoint at
http://localhost:8000/docs, then the page.

### A. "Add a column", e.g. a language for each source
```sql
ALTER TABLE sources ADD COLUMN language VARCHAR(30) NOT NULL DEFAULT 'English';
UPDATE sources SET language = 'Arabic' WHERE source_name = 'Al Jazeera';
```
`backend/routes/sources.py`: add `language` to the SELECT:
`SELECT source_id, source_name, website, country, language FROM sources …`

`frontend/app/admin/articles/page.js`: show it in the dropdown:
`{source.source_name} ({source.language})`

Also add the column to `CREATE TABLE sources` in `01_schema.sql`.

### B. "Add a new page", e.g. sources with their article counts
`backend/routes/sources.py`:
```python
@router.get("/sources/summary")
def sources_summary():
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT s.source_name, s.country, COUNT(a.article_id) AS articles
                FROM sources AS s
                LEFT JOIN articles AS a ON a.source_id = s.source_id
                GROUP BY s.source_id, s.source_name, s.country
                ORDER BY articles DESC
            """)
            return cursor.fetchall()
    finally:
        connection.close()
```
`frontend/lib/api.js`:
```js
export const getSourceSummary = () => request("/sources/summary");
```
New file `frontend/app/sources/page.js`:
```js
"use client";
import { useEffect, useState } from "react";
import { getSourceSummary } from "@/lib/api";

export default function SourcesPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { getSourceSummary().then(setRows); }, []);
  return (
    <main>
      <h1>Sources</h1>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Source</th><th>Country</th><th>Articles</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.source_name}><td>{row.source_name}</td><td>{row.country}</td><td>{row.articles}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```
Link it in `frontend/components/NavBar.js`: `<Link href="/sources">Sources</Link>`.

### C. "Sort search results by newest"
In `frontend/app/search/page.js`, add a state and a dropdown next to the filters:
```js
const [sortBy, setSortBy] = useState("relevance");
// after `shown` is computed:
const ordered = sortBy === "newest"
  ? [...shown].sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
  : shown;
```
Then build `bySource` from `ordered` instead of `shown`, and add:
```js
<select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
  <option value="relevance">Relevance</option>
  <option value="newest">Newest</option>
</select>
```

### D. "Add a trigger", e.g. admins can't be deleted
Add to `05_triggers.sql` and run it:
```sql
DROP TRIGGER IF EXISTS trg_users_before_delete;
DELIMITER $$
CREATE TRIGGER trg_users_before_delete
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
    IF OLD.role = 'admin' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admins cannot be deleted';
    END IF;
END$$
DELIMITER ;
-- test: DELETE FROM users WHERE email = 'admin@example.com';
```

### E. "Add a procedure", e.g. all articles from one source
```sql
DROP PROCEDURE IF EXISTS sp_articles_by_source;
DELIMITER $$
CREATE PROCEDURE sp_articles_by_source(IN p_source_name VARCHAR(150))
BEGIN
    SELECT article_id, title, published_at, label
    FROM v_article_details
    WHERE source_name = p_source_name
    ORDER BY published_at DESC;
END$$
DELIMITER ;
-- test: CALL sp_articles_by_source('Reuters');
```

### F. "Add a MongoDB query", e.g. searches per user
```js
db.search_logs.aggregate([
  { $group: { _id: "$user_id", searches: { $sum: 1 }, last: { $max: "$timestamp" } } },
  { $sort: { searches: -1 } },
])
```
In Python (inside a route): `list(mongo_db["search_logs"].aggregate([...]))` with the same stages as dicts.

### G. Small changes
- New topic or source: `INSERT INTO topics (topic_name, description) VALUES ('Sports', 'Sports news');` It appears on the home page immediately.
- Change scoring: Terms page, or `UPDATE perspective_terms SET weight = 2 WHERE term = 'crisis';` then open an article.
- Change colours: edit the variables at the top of `frontend/app/globals.css`.
- Change text on a page: edit that page's `page.js`.

---

## 14. Likely viva questions

**Why two databases?** MySQL for structured data with relationships and
constraints (users, articles, topics, scores); MongoDB for long text, arrays
and fast-growing logs that don't need joins.

**How are MySQL and MongoDB linked?** By the same integer ids (`article_id`,
`user_id`, `topic_id`). MongoDB has no foreign keys, so the backend keeps them
consistent.

**What's a transaction? Where do you use one?** A group of statements that all
succeed or all fail. `sp_add_article` inserts the article and its topics
between START TRANSACTION and COMMIT; any error triggers ROLLBACK.

**Difference between a trigger and a procedure?** A procedure is called
explicitly (`CALL`). A trigger runs automatically on INSERT/UPDATE/DELETE.

**BEFORE vs AFTER trigger?** BEFORE can change or reject the new row. AFTER
reacts once the change is done.

**Why is article_topics needed?** An article can have many topics and a topic
many articles (many-to-many). A bridge table with a composite primary key
stores each pair once.

**What happens when an article is deleted?** CASCADE removes its
article_topics and article_perspectives rows; the backend removes its MongoDB
documents.

**Why can't you delete Reuters?** ON DELETE RESTRICT: it still has articles.

**What is a view?** A saved SELECT that behaves like a read-only table. Our
comparison page reads `v_source_perspective_summary`.

**How does FULLTEXT search work?** A FULLTEXT index on (title, summary);
`MATCH … AGAINST` finds rows containing the words and gives a relevance score
used for ordering.

**How are passwords stored?** bcrypt hashes. Login hashes the typed password
and compares.

**Did you use GRANT / REVOKE?** Yes, at the database level. Website roles (admin/reader) are in `users.role` and checked by the backend, because website users never log in to MySQL. For MySQL itself we use least privilege: `CREATE ROLE npe_app_role`, `GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE` to it, and the backend connects as `npe_app`, which has that role. It cannot DROP or ALTER. `npe_viewer` is read-only. REVOKE removes a privilege again.

**How do you stop a reader using admin features?** The backend checks the role
in the signed token (`require_admin` → 403). Hiding buttons is only convenience.

**How do you prevent SQL injection?** Parameterised queries (`%s`
placeholders); user input is never joined into SQL text.

**Is the label "bias"?** No. It's a transparent rule-based indicator; the
matched words are shown for every article.

**What does an index do?** Lets the database find rows without scanning the
whole table, like a book index. We index FK columns, dates, FULLTEXT, and in
MongoDB `article_id` and `user_id + timestamp`.

---

## 15. Troubleshooting

| Problem | Fix |
|---|---|
| Website "Failed to fetch" | Backend (terminal 1) isn't running |
| `Access denied for user 'root'` | wrong `MYSQL_PASSWORD` in `backend/.env` |
| `ServerSelectionTimeoutError` | MongoDB isn't running (Windows: Services → MongoDB Server → Start) |
| `Table ... already exists` | use the reset in DEMO_COMMANDS.md section 0 |
| `published_at cannot be in the future` while seeding | your computer's date is wrong (seed articles are dated October 2026) |
| Keep getting sent to the login page | token expired after 24h or `JWT_SECRET` changed: log in again |
| Article shows no perspective panel | run `python seed_content.py` (MongoDB has no article text) |
| `Document failed validation` in mongosh | use `NumberInt(2)` for ids and include every required field |
