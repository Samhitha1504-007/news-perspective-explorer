// Owner: P2
// Shows WHY an article got its label. `analysis` is the response of
// GET /analyze/{id}: { label, scores: {positive, neutral, critical}, matched_terms: [...] }

const LABELS = ["positive", "neutral", "critical"];

export default function PerspectivePanel({ analysis }) {
  const { label, scores, matched_terms: terms } = analysis;
  const total = LABELS.reduce((sum, key) => sum + scores[key], 0);

  return (
    <section className="panel">
      <p className="kicker">Perspective indicator</p>
      <p>
        <span className={`label label-${label}`}>{label}</span>
      </p>

      {/* Each colour's width is its share of the total score */}
      <div className="bar">
        {LABELS.map((key) => (
          <div key={key} className={`bar-${key}`}
            style={{ width: total > 0 ? `${(scores[key] / total) * 100}%` : 0 }} />
        ))}
      </div>
      <p className="muted">
        Positive {scores.positive} · Neutral {scores.neutral} · Critical {scores.critical}
      </p>

      {terms.length === 0 ? (
        <p className="muted">No indicator words found, so the article is Neutral.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Word found</th><th>Category</th><th>Times × weight</th><th>Adds</th></tr>
            </thead>
            <tbody>
              {terms.map((term) => (
                <tr key={term.term}>
                  <td><mark className={`hl-${term.category}`}>{term.term}</mark></td>
                  <td>{term.category}</td>
                  <td>{term.count} × {term.weight}</td>
                  <td>{term.contribution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted">
        Matched words are highlighted in the article below. The label is the
        category with the highest score. Ties count as Neutral.
        Admins can change the words and weights on the Terms page.
      </p>
    </section>
  );
}
