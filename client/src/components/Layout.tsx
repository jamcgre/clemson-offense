import { NavLink, Outlet } from "react-router-dom";
import { useSeasons } from "../seasons";

export function Layout() {
  const { seasons } = useSeasons();

  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <NavLink to="/" className="wordmark" end>
            Clemson Offense Lab
          </NavLink>
          <nav className="site-nav" aria-label="Primary">
            <NavLink to="/" end>
              Overview
            </NavLink>
            <NavLink to="/method">Method</NavLink>
          </nav>
        </div>
      </header>
      {seasons.length > 0 && (
        <div className="year-bar">
          <nav className="wrap years" aria-label="Seasons">
            {seasons.map((season) => (
              <NavLink key={season.season} to={`/season/${season.season}`}>
                {season.season}
                {season.partial ? <span className="year-note"> live</span> : null}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
      <main id="content" className="wrap">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p className="wrap">
          Play-by-play, drives, and predicted points added from CollegeFootballData. This project is not affiliated
          with Clemson University.
        </p>
      </footer>
    </>
  );
}
