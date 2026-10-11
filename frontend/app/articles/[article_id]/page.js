// Owner: P1 (title, source, content) + P2 (<PerspectivePanel />)
export default function ArticlePage({ params }) {
  const { article_id } = params;
  return <main>Article {article_id} (TODO)</main>;
}
