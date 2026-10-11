# Owner: P2
# Rule-based perspective scoring: tokenize article content, match against
# perspective_terms, sum weights per category, pick label. Writes
# article_perspectives (MySQL) and perspective_analysis (MongoDB).
