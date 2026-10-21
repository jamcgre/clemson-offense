export function SetupNotice({ message, empty = false }: { message?: string; empty?: boolean }) {
  return (
    <section className="notice">
      <p className="kicker">Setup</p>
      <h1>{empty ? "No seasons loaded yet" : "The report could not be loaded"}</h1>
      {message && !empty ? <p className="lede">{message}</p> : <p className="lede">The database is empty.</p>}
      <ol>
        <li>
          Copy <code>server/.env.example</code> to <code>server/.env</code> and set <code>CFBD_API_KEY</code>. Create a
          key at collegefootballdata.com.
        </li>
        <li>
          Start Postgres with <code>docker compose up -d</code>.
        </li>
        <li>
          Load 2018–2026 with <code>npm run ingest</code>.
        </li>
        <li>
          Start the API with <code>npm run dev:server</code> and this site with <code>npm run dev:client</code>.
        </li>
      </ol>
    </section>
  );
}
