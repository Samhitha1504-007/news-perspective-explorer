# Owner: P1
# Keyword extraction: the most frequent meaningful words in an article.
#   1. lowercase the text and split it into words
#   2. drop common filler words ("the", "said", ...) and very short words
#   3. count the rest and keep the top N
# Results go into MongoDB article_metadata.keywords.

import re
from collections import Counter

STOP_WORDS = {
    "about", "after", "also", "been", "before", "being", "could", "demo",
    "from", "have", "into", "more", "most", "next", "over", "said", "says",
    "some", "still", "than", "that", "their", "them", "then", "there",
    "they", "this", "were", "what", "when", "which", "while", "will",
    "with", "would", "year", "your", "article", "synthetic",
}


def extract_keywords(text: str, top_n: int = 8) -> list:
    words = re.findall(r"[a-z]+", text.lower())
    meaningful = [word for word in words if len(word) >= 4 and word not in STOP_WORDS]
    return [word for word, _count in Counter(meaningful).most_common(top_n)]


def count_words(text: str) -> int:
    return len(re.findall(r"\w+", text))
