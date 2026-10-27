// Owner: P1
// Keyword extraction for MongoDB article_metadata: the most frequent
// meaningful words in an article (lower-case, no filler words, 4+ letters).
const STOP_WORDS = new Set([
  "about", "after", "also", "been", "before", "being", "could", "from", "have",
  "into", "more", "most", "next", "over", "said", "says", "some", "still", "than",
  "that", "their", "them", "then", "there", "they", "this", "were", "what", "when",
  "which", "while", "will", "with", "would", "year", "your", "such", "does", "only",
]);

export function extractKeywords(text, topN = 8) {
  const counts = new Map();
  for (const word of text.toLowerCase().match(/[a-z]+/g) || []) {
    if (word.length < 4 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([word]) => word);
}

export function countWords(text) {
  return (text.match(/\w+/g) || []).length;
}

export async function saveMetadata(db, articleId, content) {
  await db.collection("article_metadata").updateOne(
    { article_id: articleId },
    {
      $set: {
        article_id: articleId,
        keywords: extractKeywords(content),
        word_count: countWords(content),
        updated_at: new Date(),
      },
    },
    { upsert: true }
  );
}
