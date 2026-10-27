-- =====================================================================
-- Demo data. Run after 04_triggers.sql.
--
-- Articles: 5 real news events, each covered by 3 real outlets, so the
-- comparison page compares how sources framed the same event.
-- title, url and date are the real published article. content is a
-- short summary written by us (we do not copy the outlets' text); it is
-- what SQL scores. Inserting an article fires trg_articles_after_insert,
-- which scores it automatically.
-- =====================================================================
USE news_perspective_db;

-- --------------------------------------------------------------- P2
INSERT INTO perspective_categories (category_name, description) VALUES
    ('Positive', 'Framing dominated by positive indicator terms'),
    ('Neutral',  'Reporting language, or no clear dominant framing'),
    ('Critical', 'Framing dominated by critical indicator terms');

INSERT INTO sources (source_name, website, country, description) VALUES
    ('Al Jazeera', 'https://www.aljazeera.com', 'Qatar',         'International news network'),
    ('CNBC',       'https://www.cnbc.com',      'United States', 'Business and financial news network'),
    ('Euronews',   'https://www.euronews.com',  'France',        'European news channel'),
    ('CBS News',   'https://www.cbsnews.com',   'United States', 'US broadcast news network');

-- Terms must be inserted BEFORE the articles, so each article is scored
-- against the full list when its insert trigger fires.
INSERT INTO perspective_terms (term, category_id, weight)
SELECT t.term, c.category_id, t.weight
FROM (
              SELECT 'successful' AS term, 'Positive' AS cat, 1.00 AS weight
    UNION ALL SELECT 'benefit',       'Positive', 1.00
    UNION ALL SELECT 'improved',      'Positive', 1.20
    UNION ALL SELECT 'progress',      'Positive', 1.00
    UNION ALL SELECT 'opportunity',   'Positive', 1.10
    UNION ALL SELECT 'historic',      'Positive', 1.20
    UNION ALL SELECT 'landmark',      'Positive', 1.20
    UNION ALL SELECT 'breakthrough',  'Positive', 1.30
    UNION ALL SELECT 'welcomed',      'Positive', 1.00
    UNION ALL SELECT 'boost',         'Positive', 1.00
    UNION ALL SELECT 'reported',      'Neutral',  1.00
    UNION ALL SELECT 'announced',     'Neutral',  1.00
    UNION ALL SELECT 'stated',        'Neutral',  1.00
    UNION ALL SELECT 'according to',  'Neutral',  1.00
    UNION ALL SELECT 'confirmed',     'Neutral',  1.00
    UNION ALL SELECT 'voted',         'Neutral',  1.00
    UNION ALL SELECT 'decision',      'Neutral',  0.80
    UNION ALL SELECT 'crisis',        'Critical', 1.20
    UNION ALL SELECT 'failure',       'Critical', 1.20
    UNION ALL SELECT 'controversy',   'Critical', 1.00
    UNION ALL SELECT 'alleged',       'Critical', 1.00
    UNION ALL SELECT 'damage',        'Critical', 1.10
    UNION ALL SELECT 'setback',       'Critical', 1.20
    UNION ALL SELECT 'shock',         'Critical', 1.20
    UNION ALL SELECT 'blow',          'Critical', 1.20
    UNION ALL SELECT 'concern',       'Critical', 1.00
    UNION ALL SELECT 'concerns',      'Critical', 1.00
    UNION ALL SELECT 'criticized',    'Critical', 1.00
    UNION ALL SELECT 'warned',        'Critical', 1.00
    UNION ALL SELECT 'loopholes',     'Critical', 1.10
    UNION ALL SELECT 'emergency',     'Critical', 1.10
) AS t
JOIN perspective_categories AS c ON c.category_name = t.cat;

-- --------------------------------------------------------------- P1
INSERT INTO topics (topic_name, description) VALUES
    ('Artificial Intelligence', 'AI research, applications, risks and regulation'),
    ('Climate Change',          'Climate policy, emissions and international climate talks'),
    ('Economy',                 'Interest rates, inflation, markets and economic policy'),
    ('Elections',               'Elections, campaigns, results and governments'),
    ('Public Health',           'Disease outbreaks, health emergencies and health policy');

-- Demo logins: admin@example.com / admin123, reader1@ and reader2@example.com / reader123
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin User', 'admin@example.com',   '$2b$12$s.7mnEt.vEz8mdtuQxdXEOjFHBynx4t5AXanc1v29eOtnNzgX1xty', 'admin'),
    ('Reader One', 'reader1@example.com', '$2b$12$UD2qQlkTxjnnUzGvWR..eeIAYU5E/RxEN4qznPIfqubEvF/tN8h32', 'reader'),
    ('Reader Two', 'reader2@example.com', '$2b$12$UD2qQlkTxjnnUzGvWR..eeIAYU5E/RxEN4qznPIfqubEvF/tN8h32', 'reader');

-- --------------------------------------------------------------- articles
-- Split: P1 adds the AI, Elections and Public Health stories,
--        P2 adds the Climate Change and Economy stories.
INSERT INTO articles (source_id, title, url, published_at, summary, content)
SELECT s.source_id, d.title, d.url, d.published_at, d.summary, d.content
FROM (
    -- ===== Artificial Intelligence: EU AI Act vote, 13 March 2024 (P1)
    SELECT 'Al Jazeera' AS source_name,
        'EU parliament greenlights landmark artificial intelligence regulations' AS title,
        'https://www.aljazeera.com/news/2024/3/13/eu-parliament-greenlights-landmark-artificial-intelligence-regulations' AS url,
        '2024-03-13 14:00:00' AS published_at,
        'European Parliament approves the AI Act, which sorts AI systems by risk.' AS summary,
        'The European Parliament voted to approve the Artificial Intelligence Act, which supporters described as a landmark set of rules for the technology. The law sorts AI systems by risk, bans uses such as social scoring and limits police use of real-time facial recognition. Lawmakers said the act offers an opportunity to protect citizens while still allowing innovation, although some digital rights groups raised concerns that the exemptions for law enforcement go too far.' AS content
    UNION ALL SELECT 'CNBC',
        'World''s first major act to regulate AI passed by European lawmakers',
        'https://www.cnbc.com/2024/03/13/european-lawmakers-endorse-worlds-first-major-act-to-regulate-ai.html',
        '2024-03-13 12:00:00',
        'European lawmakers pass the first major set of rules for artificial intelligence.',
        'European lawmakers voted to pass the AI Act, the first major set of rules for artificial intelligence anywhere in the world. The regulation applies stricter requirements to high-risk systems and requires transparency from developers of general-purpose models. Companies that break the rules can be fined, and some technology firms have warned that the compliance burden could slow innovation in Europe. The law still needs final approval from member states before it takes effect in stages.'
    UNION ALL SELECT 'Euronews',
        'Lawmakers approve AI Act with overwhelming majority',
        'https://www.euronews.com/my-europe/2024/03/13/lawmakers-approve-ai-act-with-overwhelming-majority',
        '2024-03-13 13:00:00',
        'MEPs adopt the AI Act by a large majority.',
        'Members of the European Parliament voted by a large majority to adopt the AI Act. According to the Parliament, 523 members voted in favour, 46 against and 49 abstained. The Parliament announced that the act bans certain AI practices and sets obligations for high-risk applications. Officials confirmed that the rules will apply gradually after the law is published.'

    -- ===== Climate Change: COP28 agreement, 13 December 2023 (P2)
    UNION ALL SELECT 'Al Jazeera',
        'Historic COP28 deal agrees to ''transition away'' from fossil fuels',
        'https://www.aljazeera.com/news/2023/12/13/new-un-climate-deal-calls-for-transitioning-away-from-fossil-fuels',
        '2023-12-13 10:00:00',
        'COP28 deal calls for a transition away from fossil fuels for the first time.',
        'Nearly 200 countries at the COP28 summit in Dubai agreed a deal that, for the first time, calls for a transition away from fossil fuels in energy systems. The summit''s president called the agreement historic, and many delegations welcomed it as progress. The text also asks countries to triple renewable energy capacity by 2030. Some small island states said the deal still contains loopholes and does not go far enough.'
    UNION ALL SELECT 'CNBC',
        'COP28 climate summit ends with deal to transition away from fossil fuels',
        'https://www.cnbc.com/2023/12/13/countries-agree-to-deal-at-cop28-climate-summit.html',
        '2023-12-13 11:00:00',
        'Countries at COP28 reach a deal on transitioning away from fossil fuels.',
        'Countries at the COP28 climate talks in Dubai reached an agreement that calls for transitioning away from fossil fuels in energy systems in a just and orderly way. The decision was announced after negotiations ran past their deadline. According to the final text, nations should also triple renewable capacity and double the rate of energy efficiency gains by 2030. Oil-producing countries had resisted stronger language on phasing out fossil fuels.'
    UNION ALL SELECT 'CBS News',
        'COP28 climate summit OK''s controversial pact that gathering''s leader calls "historic"',
        'https://www.cbsnews.com/news/cop28-climate-summit-oks-controversial-historic-pact-climate-change/',
        '2023-12-13 12:00:00',
        'COP28 approves a fossil fuel pact that critics say does not go far enough.',
        'Delegates at COP28 approved a pact on fossil fuels that the summit''s leader called historic, but which critics said was a failure to commit to a full phase-out. Environmental groups criticized loopholes that allow continued gas use and carbon capture. Small island nations raised concerns that they were not in the room when the deal was approved, and warned that the agreement does not match the scale of the climate crisis.'

    -- ===== Economy: US Federal Reserve rate cut, 18 September 2024 (P2)
    UNION ALL SELECT 'Al Jazeera',
        'US Fed cuts rates by larger than usual half-percentage point',
        'https://www.aljazeera.com/economy/2024/9/18/us-fed-cuts-rates-by-larger-than-usual-half-percentage-point',
        '2024-09-18 19:00:00',
        'The Federal Reserve cuts its benchmark rate by half a percentage point.',
        'The US Federal Reserve announced a cut of half a percentage point to its benchmark interest rate, lowering it to a range of 4.75 to 5 percent. It was the first cut since 2020 and larger than the usual quarter-point move. Fed chair Jerome Powell stated that the decision reflected growing confidence that inflation is moving back towards target. One policymaker voted against, preferring a smaller cut.'
    UNION ALL SELECT 'CNBC',
        'Fed cuts rates by a half point at September 2024 meeting',
        'https://www.cnbc.com/2024/09/18/fed-cuts-rates-september-2024-.html',
        '2024-09-18 18:00:00',
        'The Fed lowers rates by half a point, its first cut in more than four years.',
        'The Federal Reserve lowered its key interest rate by half a percentage point, its first reduction in more than four years. Markets welcomed the move as a boost for borrowers, and officials signalled that more cuts could follow. Policymakers said inflation had improved substantially while the job market had cooled. Governor Michelle Bowman voted against the move, preferring a quarter-point cut.'
    UNION ALL SELECT 'Euronews',
        'US Federal Reserve set to cut interest rates for first time in 4 years',
        'https://www.euronews.com/business/2024/09/18/federal-reserve-is-set-to-cut-interest-rates-for-the-first-time-in-4-years',
        '2024-09-18 09:00:00',
        'Preview: the Fed is expected to cut rates for the first time in four years.',
        'The US Federal Reserve was expected to cut interest rates for the first time in four years at its September meeting. Investors were divided over whether the cut would be a quarter point or half a point. Some economists warned that a large cut could signal concern about a weakening labour market, while others said high borrowing costs had already caused damage to households and businesses.'

    -- ===== Elections: India general election result, 4-5 June 2024 (P1)
    UNION ALL SELECT 'Al Jazeera',
        'Modi''s BJP loses majority in India election shock, needs allies for gov''t',
        'https://www.aljazeera.com/news/2024/6/4/modis-bjp-loses-majority-in-india-election-shock-needs-allies-for',
        '2024-06-04 16:00:00',
        'The BJP falls short of a majority and must rely on coalition partners.',
        'Prime Minister Narendra Modi''s Bharatiya Janata Party fell short of a parliamentary majority in a result that came as a shock after exit polls had predicted a landslide. The BJP won 240 of 543 seats, below the 272 needed, and must rely on coalition partners to form a government. The opposition INDIA alliance performed far better than expected, a major setback for Modi after ten years in power.'
    UNION ALL SELECT 'CNBC',
        'India''s election results deal a blow to Modi''s political, economic plans',
        'https://www.cnbc.com/2024/06/05/indias-election-dealt-a-political-blow-to-bjp-and-modis-political-agenda.html',
        '2024-06-05 06:00:00',
        'Losing the BJP''s outright majority may slow Modi''s economic reforms.',
        'India''s election results dealt a blow to Prime Minister Narendra Modi, whose party lost its outright majority. Analysts warned that relying on coalition partners could slow economic reforms such as changes to land and labour laws. Indian stock markets fell sharply as the results came in, reflecting investor concern, before recovering some of the losses the next day.'
    UNION ALL SELECT 'CBS News',
        'India 2024 election results show Prime Minister Narendra Modi winning third term, but with a smaller mandate',
        'https://www.cbsnews.com/news/india-2024-election-results-narendra-modi-wins-for-bjp-but-loses-seats/',
        '2024-06-04 18:00:00',
        'Modi wins a third term but his party loses seats.',
        'Narendra Modi is set to serve a third term as India''s prime minister after his National Democratic Alliance won a majority, according to results announced by the Election Commission. His own party lost seats and will depend on allies in the coalition. Modi called the outcome a historic achievement, while opposition leaders said voters had sent a clear message.'

    -- ===== Public Health: WHO mpox emergency, 14 August 2024 (P1)
    UNION ALL SELECT 'Al Jazeera',
        'WHO declares mpox a global public health emergency',
        'https://www.aljazeera.com/news/2024/8/14/who-declares-mpox-a-global-public-health-emergency',
        '2024-08-14 18:00:00',
        'The WHO declares the spread of mpox in Africa a global health emergency.',
        'The World Health Organization declared the spread of mpox in Africa a public health emergency of international concern, its highest level of alert. The decision followed an outbreak in the Democratic Republic of Congo that has spread to neighbouring countries. WHO chief Tedros Adhanom Ghebreyesus stated that a coordinated international response was needed to stop the outbreak and save lives.'
    UNION ALL SELECT 'CNBC',
        'WHO declares mpox a global public health emergency for second time in two years',
        'https://www.cnbc.com/2024/08/14/who-declares-mpox-a-global-public-health-emergency-for-second-time-in-two-years.html',
        '2024-08-14 17:00:00',
        'Mpox is declared a global health emergency for the second time in two years.',
        'The WHO declared mpox a global public health emergency for the second time in two years as a new strain spreads in Africa. The agency announced that it was working to speed up access to vaccines and confirmed that emergency funds had been released for the response. Health officials reported cases in countries that had not recorded the disease before.'
    UNION ALL SELECT 'Euronews',
        'WHO declares Africa''s mpox outbreak a global health emergency as new strain spreads',
        'https://www.euronews.com/health/2024/08/14/who-declares-africas-mpox-outbreak-a-global-health-emergency-as-new-strain-spreads',
        '2024-08-14 16:00:00',
        'A new mpox strain spreads beyond the Democratic Republic of Congo.',
        'The WHO declared Africa''s mpox outbreak a global health emergency as a new, more easily spread strain moves beyond the Democratic Republic of Congo. Experts warned that limited vaccine supplies and weak health systems could turn the outbreak into a wider crisis. The Africa Centres for Disease Control and Prevention had declared its own continental emergency a day earlier.'
) AS d
JOIN sources AS s ON s.source_name = d.source_name;

-- Link each article to its topic by matching the event in the URL.
INSERT INTO article_topics (article_id, topic_id)
SELECT a.article_id, t.topic_id
FROM articles AS a
JOIN topics AS t ON t.topic_name = CASE
        WHEN a.url REGEXP 'ai-act|artificial-intelligence|regulate-ai' THEN 'Artificial Intelligence'
        WHEN a.url REGEXP 'cop28|fossil-fuels'                        THEN 'Climate Change'
        WHEN a.url REGEXP 'fed-|federal-reserve|interest-rates'       THEN 'Economy'
        WHEN a.url REGEXP 'election'                                  THEN 'Elections'
        WHEN a.url REGEXP 'mpox'                                      THEN 'Public Health'
    END;

-- The Fed decision is also a markets story; the AI Act is also about the economy
-- (shows an article belonging to two topics: COVERS is M : N).
INSERT INTO article_topics (article_id, topic_id)
SELECT a.article_id, t.topic_id
FROM articles AS a JOIN topics AS t ON t.topic_name = 'Economy'
WHERE a.url LIKE '%cnbc.com/2024/03/13/%';

-- --------------------------------------------------------------- reader activity
-- P1: follows and bookmarks
INSERT INTO topic_follows (user_id, topic_id)
SELECT u.user_id, t.topic_id FROM users u JOIN topics t
WHERE (u.email = 'reader1@example.com' AND t.topic_name IN ('Artificial Intelligence', 'Climate Change'))
   OR (u.email = 'reader2@example.com' AND t.topic_name = 'Elections');

INSERT INTO source_follows (user_id, source_id)
SELECT u.user_id, s.source_id FROM users u JOIN sources s
WHERE u.email = 'reader1@example.com' AND s.source_name = 'CNBC';

INSERT INTO bookmarks (user_id, article_id)
SELECT u.user_id, a.article_id FROM users u JOIN articles a
WHERE u.email = 'reader1@example.com' AND a.url LIKE '%cbsnews.com/news/cop28%';

-- P1: comments
INSERT INTO comments (article_id, user_id, body)
SELECT a.article_id, u.user_id, 'Interesting how differently this was framed compared with the other outlets.'
FROM articles a JOIN users u
WHERE a.url LIKE '%cbsnews.com/news/cop28%' AND u.email = 'reader1@example.com';

INSERT INTO comments (article_id, user_id, body)
SELECT a.article_id, u.user_id, 'The seat numbers here match the official results.'
FROM articles a JOIN users u
WHERE a.url LIKE '%aljazeera.com/news/2024/6/4/%' AND u.email = 'reader2@example.com';

-- P2: label feedback (through the procedure, so the rules are applied)
SET @r1 = (SELECT user_id FROM users WHERE email = 'reader1@example.com');
SET @r2 = (SELECT user_id FROM users WHERE email = 'reader2@example.com');
SET @cop_cbs  = (SELECT article_id FROM articles WHERE url LIKE '%cbsnews.com/news/cop28%');
SET @fed_cnbc = (SELECT article_id FROM articles WHERE url LIKE '%cnbc.com/2024/09/18/%');
CALL sp_set_feedback(@r1, @cop_cbs,  'agree',    NULL);
CALL sp_set_feedback(@r2, @cop_cbs,  'agree',    NULL);
CALL sp_set_feedback(@r1, @fed_cnbc, 'disagree', 'Neutral');
