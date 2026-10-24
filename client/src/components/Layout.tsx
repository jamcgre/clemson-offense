import { NavLink, Outlet } from "react-router-dom";
import { useSeasons } from "../seasons";
import React from "react";

export function Layout() {
  const { seasons } = useSeasons();

  const [hideGarbageTime, setHideGarbageTime] = React.useState<boolean>(false);


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
          <div className="wrap year-bar-inner">
            <label className="garbage-toggle">
              <input type="checkbox" checked={hideGarbageTime} onChange={() => setHideGarbageTime(!hideGarbageTime)} />
              Hide garbage time
            </label>
            <nav className="years" aria-label="Seasons">
              {seasons.map((season) => (
                <NavLink key={season.season} to={`/season/${season.season}`}>
                  {season.season}
                  {season.partial ? <span className="year-note"> live</span> : null}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
      <main id="content" className="wrap">
        <Outlet context={{ hideGarbageTime }} />
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
