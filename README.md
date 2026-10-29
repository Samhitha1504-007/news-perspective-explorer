# News Perspective Explorer

DBMS Level 3 project. Readers search a news event, read how different outlets
covered it, and see a rule-based **Positive / Neutral / Critical** label for each
article (scores and label are computed by SQL and stored in `classified_as`). They can save articles, follow topics and sources, comment, and agree or
disagree with a label. Admins add articles, edit the scoring terms, see statistics, view and delete everyone's
search logs (MongoDB) and make users admin or reader. Readers manage their own search history
(MongoDB CRUD: search, list, pin, delete).

**Stack:** MySQL 8 (main data and all scoring logic) · MongoDB (keywords and activity
logs) · Next.js 14 (pages and API routes). There is no Python and no separate backend:
the classification is done entirely in SQL (functions, procedures, triggers), and the
API is Next.js route handlers in `frontend/app/api`.

All 15 seed articles are real published articles (real title, date and link). The
`content` column holds a short summary we wrote ourselves, and that is the text SQL scores.

## Documents

- [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md): ER diagram, relational schema, MongoDB model, mapping rules
- [docs/DEMO_COMMANDS.md](docs/DEMO_COMMANDS.md): every command for the demo, in order
- [docs/PRESENTATION_GUIDE.md](docs/PRESENTATION_GUIDE.md): how it works, who did what, viva questions

## Folder layout

```
database/mysql/
  01_schema.sql               14 tables: 7 entity tables + 7 relationship tables
  02_functions_procedures.sql 3 functions, 8 procedures (scoring engine, transaction, feed)
  03_views.sql                5 views (derived label, score pivot, comparison, feedback)
  04_triggers.sql             11 triggers (validation + automatic re-scoring)
  05_seed_data.sql            categories, terms, sources, topics, users, 15 real articles
  06_db_roles.sql             MySQL roles admin_role / reader_role + their accounts
  07_crud_demo.sql            CRUD demo (safe to re-run)
  08_alter_drop_demo.sql      ALTER / DROP demo (leaves the schema unchanged)
  queries.sql                 6 viva queries per person
database/mongodb/
  01_collections.js           4 collections with $jsonSchema validators
  02_indexes.js               unique, multikey and compound indexes
  03_crud_demo.js             CRUD demo
  aggregations.js             3 aggregation queries per person
frontend/
  app/api/**/route.js         33 API routes (server side, talk to MySQL and MongoDB)
  app/**/page.js              pages
  components/                 shared React components
  lib/server/                 db.js (MySQL pool), mongo.js, auth.js (JWT), keywords.js
  lib/api.js                  browser-side calls to /api
  scripts/seed-mongo.mjs      fills MongoDB from the MySQL articles
```

## Setup (Windows PowerShell)

Needs MySQL 8, MongoDB 6+ (with `mongosh`) and Node.js 20.6 or newer.

```powershell
# 1. MySQL: open the client from the repo folder, then source the files in order
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
# 2. MongoDB
mongosh database/mongodb/01_collections.js
mongosh database/mongodb/02_indexes.js

# 3. Website
cd frontend
npm install
copy .env.example .env.local
npm run seed:mongo        # keywords for every article + some demo activity
npm run dev               # http://localhost:3000
```

Re-running `01_schema.sql` drops and rebuilds the database, so run 02 to 06 again after it.

Demo logins:

| Email | Password | Role |
|---|---|---|
| admin@example.com | admin123 | admin |
| reader1@example.com | reader123 | reader |
| reader2@example.com | reader123 | reader |

## Who owns what

Every file in `frontend/` starts with an `// Owner:` comment, and every SQL object has a
`-- P1` / `-- P2` comment above it.

| | P1 (Samhitha): articles, search and reader features | P2 (Samika): perspective scoring, comparison and analytics |
|---|---|---|
| Entity tables | `users`, `topics`, `articles`, `comments` | `sources`, `perspective_categories`, `perspective_terms` |
| Relationship tables | `article_topics`, `bookmarks`, `topic_follows`, `source_follows` | `classified_as`, `term_matches`, `label_feedback` |
| Functions / procedures | `sp_add_article` (transaction), `sp_change_user_role`, `sp_user_feed`, `sp_delete_comment`, `sp_toggle_bookmark`, `sp_most_discussed`, `fn_reading_time` | `fn_count_term`, `fn_article_label`, `fn_agreement_pct`, `sp_compute_scores`, `sp_refresh_labels`, `sp_score_article`, `sp_match_term`, `sp_topic_perspective_summary`, `sp_set_feedback` |
| Views | `v_article_details` | `v_article_labels`, `v_article_scores`, `v_source_perspective_summary`, `v_article_feedback` |
| Triggers | 4 validation triggers (articles, users, comments) | 7 scoring triggers (articles, perspective_terms) |
| Other SQL | FULLTEXT search, P1 queries, P1 part of ALTER/DROP | `06_db_roles.sql`, P2 queries, P2 part of ALTER/DROP |
| MongoDB | `article_metadata`, `search_logs` | `reading_history`, `comparison_sessions` |
| API | login, register, topics, sources, search, articles, related, comments, bookmarks, follows, feed, admin/articles, admin/users, admin/search-logs, search-history (MongoDB CRUD), most-discussed | analyze, compare, perspectives, keywords, history, feedback, admin/terms, admin/stats |
| Pages | home, login, register, search, article page, feed, saved, admin add-article, admin users, admin search logs, search history box, most discussed | compare, history, admin terms, admin stats, perspective panel + feedback box |

## Rules we follow

- snake_case everywhere; `article_id`, `topic_id`, `user_id` mean the same thing in MySQL, MongoDB and the API.
- Database credentials live only in `frontend/.env.local`, which is git-ignored. Never commit it.
- RBAC: the website and MySQL use the same two roles. An admin's requests run as MySQL
  account `npe_admin` (`admin_role`), a reader's as `npe_reader` (`reader_role`), never root.
- Each person commits their own files from their own GitHub account.
