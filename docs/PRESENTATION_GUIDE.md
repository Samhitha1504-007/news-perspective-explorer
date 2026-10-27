# Presentation guide

## 1. The project in four sentences

News outlets often describe the same event very differently. Our site shows a few real
events (EU AI Act, COP28, the Fed's 2024 rate cut, India's 2024 election, the mpox
emergency), each covered by three real outlets, and labels each article Positive,
Neutral or Critical. The label is computed **inside MySQL** from weighted indicator
words, so it is explainable: you can see exactly which words produced it. Readers can
save, follow, comment and disagree with a label; admins manage articles and the word list.

## 2. What we changed after the review

| Feedback | What we did |
|---|---|
| No Python; everything in advanced SQL or Next.js | Removed the FastAPI backend. Scoring is now SQL functions, procedures and triggers. The API is Next.js route handlers (`frontend/app/api`). |
| ER diagram wrong for some tables | Redrew it in Chen notation from the final schema. Every M:N relationship is now its own table, and every relationship in the diagram matches a table or FK. |
| `classified_as` primary key | Now `PRIMARY KEY (article_id, category_id)`: one score row per article per category. |
| No user-side functionality | Added bookmarks, follow topic/source, a personal feed, comments, and agree/disagree with a label (with a suggested label). |

## 3. How a request flows

```
Browser page (React)  →  /api/... route (Next.js, server side)  →  MySQL (npe_admin or npe_reader)
                                                                →  MongoDB (logs, keywords)
```

- Pages call `lib/api.js`, which sends `fetch('/api/...')` with the login token.
- Route handlers use `lib/server/db.js` (a mysql2 connection pool) with `?` placeholders,
  so user input is never pasted into SQL (no SQL injection).
- `lib/server/auth.js`: login checks the bcrypt hash and returns a JWT; `requireUser` /
  `requireAdmin` check it on every protected route. MySQL errors become HTTP errors
  (CHECK failure → 400, duplicate → 409, permission denied → 403), so the database's
  own message reaches the screen.
- Credentials are only in `.env.local` on the server. Nothing database-related goes to the browser.

## 4. Advanced SQL: what and where

| Feature | Where | Owner |
|---|---|---|
| Stored functions | `fn_count_term`, `fn_article_label`, `fn_agreement_pct` (02) | P2 |
| Stored procedures | scoring: `sp_compute_scores`, `sp_score_article`, `sp_match_term`; `sp_topic_perspective_summary` (OUT params), `sp_set_feedback` | P2 |
| | `sp_add_article` (transaction), `sp_change_user_role`, `sp_user_feed` (UNION) | P1 |
| Transaction | `sp_add_article`: `START TRANSACTION` … `COMMIT`; an `EXIT HANDLER` does `ROLLBACK` and re-raises the error. Isolation: InnoDB default, REPEATABLE READ | P1 |
| Triggers (11) | validation: future date, lower-case email, trimming (4) | P1 |
| | automatic scoring on article insert/update and term insert/update/delete (7) | P2 |
| Views (5) | `v_article_details` | P1 |
| | `v_article_labels` (ROW_NUMBER), `v_article_scores` (pivot), `v_source_perspective_summary`, `v_article_feedback` | P2 |
| Window functions | `ROW_NUMBER()` in `v_article_labels`; `RANK()` in queries and admin stats | both |
| CTE | P1-Q6, admin stats "most saved" | P1 |
| FULLTEXT search | index `ft_articles_text(title, summary, content)`, `MATCH … AGAINST` in `/api/search` | P1 |
| REGEXP | whole-word counting in `fn_count_term`; CHECK on term format | P2 |
| Subqueries | correlated (P1-Q4, P2-Q5 NOT EXISTS), scalar (P2-Q3) | both |
| Upsert | `INSERT … ON DUPLICATE KEY UPDATE` in scoring and feedback | P2 |
| DB roles | `CREATE ROLE`, `GRANT`, plus a `REVOKE` demo, in `06_db_roles.sql` | P2 |
| Constraints | PK, composite PK, FK RESTRICT/CASCADE, UNIQUE, ENUM, CHECK | both |

## 5. Explaining the scoring (P2)

- `perspective_terms` holds 31 words, each in one category with a weight
  (e.g. *crisis* → Critical, 1.2; *landmark* → Positive, 1.2; *announced* → Neutral, 1.0).
- `fn_count_term` counts a word as a whole word with `REGEXP_REPLACE` on `\b` word
  boundaries (so *concern* does not match inside *concerns*).
- `sp_compute_scores` writes the counts into `term_matches`, then upserts one row per
  category into `classified_as` with `score = SUM(occurrences × weight)`.
- The label is the highest score (`v_article_labels`). Ties go to Neutral.
- MySQL does not allow a trigger to change the table it fires on, so the article
  triggers pass the text into the procedure instead of re-reading `articles`.
- When a term changes, the term triggers subtract its old contribution and add the new
  one for every article. We checked that this always equals a full recomputation.

Limitations to admit if asked: it is word counting, not understanding. It misses
negation ("not a failure") and sarcasm, and the weights are our own choice. That is
why we let readers disagree and store their suggested label.

## 6. Explaining the reader features (P1)

| Feature | Table | Rule enforced by the database |
|---|---|---|
| Save article | `bookmarks` (user_id, article_id) | composite PK: can't save twice |
| Follow topic / source | `topic_follows`, `source_follows` | composite PK; CASCADE on user delete |
| My feed | `sp_user_feed` | UNION of followed-topic and followed-source articles, with the reason |
| Comments | `comments` | CHECK not blank; trigger trims; only the author or an admin can delete (API) |
| Agree / disagree | `label_feedback` via `sp_set_feedback` | one vote per user per article (PK); CHECK: suggestion only with disagree; SIGNAL if suggesting the current label |

## 7. MongoDB

- `article_metadata`: keywords array per article, made when the article is added.
  Multikey index on `keywords`.
- `search_logs`: every search (user, query, result count, time).
- `reading_history`: every article view.
- `comparison_sessions`: every comparison page visit, with the sources shown.
- Each has a `$jsonSchema` validator. Ids are the MySQL ids, kept consistent by the API.
- Why not MySQL for these: arrays, append-only logs, flexible fields, no joins needed.

## 8. Likely viva questions

**Why is `classified_as` a separate table and not three columns on `articles`?**
CLASSIFIED_AS is an M:N relationship between ARTICLE and PERSPECTIVE_CATEGORY with its
own attribute (score). Mapping rule: M:N becomes a table keyed by both foreign keys.
It also means adding a fourth category needs no ALTER TABLE.

**Where are the scores and the label stored?**
In `classified_as`: one row per article per category with its `score`, and
`is_label = TRUE` on the winning one. Triggers call `sp_compute_scores` and
`sp_refresh_labels`, so they are always in sync with the text and the terms.

**What normal form are the tables in?**
3NF. No repeating groups, every non-key column depends on the whole key (e.g. `score`
on both article and category), and no non-key column depends on another non-key column.

**Where is the transaction, and what happens on failure?**
`sp_add_article`. It inserts the article and its topic links; if any topic id is
invalid it SIGNALs, the handler rolls back, and nothing is saved. Demo command in
DEMO_COMMANDS §3.

**What isolation level?**
InnoDB default, REPEATABLE READ (`SELECT @@transaction_isolation`).

**Why both website roles and MySQL roles?**
They are the same two roles. `admin_role` (account `npe_admin`) can read and write all
rows and run every procedure; `reader_role` (account `npe_reader`) can read, and only
write comments, bookmarks, follows and feedback. After login, `route()` in `auth.js`
runs the request on the account matching `users.role`, so even if a check in the API
were missing, MySQL itself would refuse (error 1142). Neither can DROP or ALTER.

**How do you stop SQL injection?**
Parameterised queries (`?` placeholders) in every route; the driver escapes values.

**How are passwords stored?**
bcrypt hashes in `users.password_hash`. The plain password is never stored.

**What if MongoDB is down?**
MySQL pages keep working. Logging fails quietly; MongoDB-only pages return a clear
"MongoDB is not available" error. Adding an article undoes the MySQL insert if the
MongoDB step fails (compensating action, since there's no cross-database transaction).

**Are the articles real?**
Yes: real titles, dates and links to the original pages. The text we score is a short
summary we wrote, because we don't copy the outlets' articles.

**What does ON DELETE CASCADE do here?**
Deleting an article removes its topic links, scores, term matches, comments, bookmarks
and votes. Show it with `07_crud_demo.sql` (counts go from 1,3,1,1 to 0,0,0,0).

## 9. Who presents what

- **P1 (Samhitha):** schema walkthrough of the article side, FULLTEXT search, the
  transaction demo, reader features on the website, CRUD and ALTER demos, P1 queries,
  MongoDB `article_metadata` / `search_logs`.
- **P2 (Samika):** ER diagram and mapping rules, scoring (functions, procedures,
  triggers), the live term-weight change, comparison page, admin stats, DB roles,
  P2 queries, MongoDB `reading_history` / `comparison_sessions` and aggregations.
