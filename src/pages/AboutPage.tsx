export function AboutPage() {
  return (
    <article className="page prose stack">
      <p className="eyebrow">About</p>
      <h1>Portable courses, structured clearly</h1>
      <p className="lede">
        Theoria Core is a fully client-side learning and authoring environment for MCF 1.0.
      </p>
      <h2>What is MCF?</h2>
      <p>
        MCF is an open, human-readable course source format built from YAML manifests and Markdown
        lessons. The declared chapter and lesson order is authoritative.
      </p>
      <h2>Browser storage</h2>
      <p>
        There are no accounts or analytics here. Your progress and authored courses stay in this
        browser unless you export them.
      </p>
      <h2>Offline by choice</h2>
      <p>
        The site works at its normal URL. Installing the optional PWA adds home-screen access and
        stronger offline availability.
      </p>
    </article>
  );
}
