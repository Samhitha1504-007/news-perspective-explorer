// Article text with the matched perspective words coloured by category.
// `terms` is matched_terms from GET /analyze/{id}.
//
// Uses the same whole-word rule as the backend scorer: (?<!\w)word(?!\w)
// so "progress" is not highlighted inside "progressive".

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function HighlightedText({ text, terms }) {
  if (!terms || terms.length === 0) return text;

  // word (lowercase) -> category, e.g. { crisis: "Critical" }
  const categoryOf = {};
  for (const term of terms) categoryOf[term.term.toLowerCase()] = term.category;

  // Longest first, so "according to" is tried before shorter words
  const words = Object.keys(categoryOf).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(?<!\\w)(${words.map(escapeRegex).join("|")})(?!\\w)`, "gi");

  // split() with a capture group keeps the matches: [text, match, text, match, ...]
  return text.split(pattern).map((part, index) =>
    index % 2 === 1
      ? <mark key={index} className={`hl-${categoryOf[part.toLowerCase()]}`}>{part}</mark>
      : part
  );
}
