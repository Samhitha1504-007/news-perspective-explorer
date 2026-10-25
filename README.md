# News Perspective Explorer

DBMS project: search a news topic, read articles from several sources, see a
rule-based Positive / Neutral / Critical perspective indicator, and compare how
sources frame the same event.

**Stack:** Next.js (frontend) · FastAPI (backend) · MySQL + MongoDB (`news_perspective_db`)

## Layout and ownership

| Path | P1: Search, Article & Data | P2: Perspective, Comparison & History |
|---|---|---|
| MySQL tables | `users`, `topics`, `articles`, `article_topics` | `sources`, `perspective_categories`, `perspective_terms`, `article_perspectives` |
| MongoDB | `article_content`, `article_metadata`, `search_logs` | `perspective_analysis`, `reading_history`, `comparison_sessions` |
| Advanced SQL | FULLTEXT search, `sp_add_article` (`04_procedures.sql`) | `v_source_perspective_summary` (`03_views.sql`), trigger (`05_triggers.sql`) |
| `backend/routes/` | `auth`, `topics`, `search`, `articles` (+ `/related`), `admin_articles`, `admin_stats` | `sources`, `perspective`, `compare`, `history`, `admin_terms` |
| `backend/services/` | `auth_service`, `keyword_service`, `article_service` | `scoring_service`, `compare_service`, `history_service` |
| `frontend/` | `app/`: `/`, `login`, `register`, `search`, `articles/[article_id]`, `admin/articles`; `components/`: `NavBar`, `SearchBar`, `ArticleCard` | perspective panel on article page, `compare/[topic_id]`, `history`, `admin/terms` |

`database/mysql/01_schema.sql` and `database/mongodb/01_collections.js` are the
shared contract. Change a name there only after you've both agreed.

## Naming rules

- snake_case for tables, columns, collections, JSON keys and API fields.
- `article_id`, `topic_id` and `user_id` everywhere. Never use `news_id` or Mongo `_id` in API payloads.
- MongoDB references hold the same INT values as MySQL ids.
- Dates in API JSON are ISO 8601.

## Setup

```bash
# MySQL (run in order)
mysql -u root -p < database/mysql/01_schema.sql
mysql -u root -p < database/mysql/03_views.sql
mysql -u root -p < database/mysql/04_procedures.sql
mysql -u root -p < database/mysql/05_triggers.sql
mysql -u root -p < database/mysql/06_seed_data.sql

# MongoDB
mongosh database/mongodb/01_collections.js
mongosh database/mongodb/02_indexes.js
mongosh database/mongodb/03_seed.js

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in credentials
python seed_content.py # article text -> MongoDB, then scores every article
uvicorn app:app --reload --port 8000

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Demo logins (from `06_seed_data.sql`):

| Email | Password | Role |
|---|---|---|
| admin@example.com | admin123 | admin |
| reader1@example.com | reader123 | reader |

API docs with a "try it" button: http://localhost:8000/docs (click **Authorize** and paste a token from `/login` to call admin routes).

## Branches

- `main`: always working.
- `person1-search`: P1's branch. `person2-comparison`: P2's branch.
- `integration`: create once the first APIs work.
- Commit from your own account only. Never commit `.env`.
