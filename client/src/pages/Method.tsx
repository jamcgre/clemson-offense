export function Method() {
  return (
    <>
      <p className="kicker">How to read it</p>
      <h1>Method</h1>
      <p className="lede">
        The lab compares Clemson’s offense from 2018 through 2026 with the 2018–2020 peak. The findings are rules, not a
        model, so each one can be checked by hand.
      </p>

      <section className="prose">
        <h2>Where the numbers come from</h2>
        <p>
          CollegeFootballData supplies games, drives, play-by-play, season predicted points added (PPA), and the havoc
          rate. The ingest job stores that response in Postgres. The pages read the database, not the live API. Spring
          games are left out. Regular season and postseason stay in.
        </p>

        <h2>Which plays count</h2>
        <p>
          Success rate and explosiveness use scrimmage plays: rushes and passes, including sacks and interceptions
          thrown. Kickoffs, punts, returns, field goals, extra points, penalties, two-point tries, kneel-downs, and
          spikes are excluded.
        </p>

        <h2>Definitions</h2>
        <dl>
          <div>
            <dt>Success rate</dt>
            <dd>A gain of at least 50% of the distance on first down, 70% on second, and the full distance on third or fourth. A listed distance under one yard counts as one yard.</dd>
          </div>
          <div>
            <dt>Explosive play rate</dt>
            <dd>The share of scrimmage plays that gain 15 yards or more.</dd>
          </div>
          <div>
            <dt>Early-down success rate</dt>
            <dd>Success rate on first and second down only.</dd>
          </div>
          <div>
            <dt>Points per drive</dt>
            <dd>
              Points the offense added on the scoreboard, so extra points are included, divided by the number of drives.
              End-of-half and end-of-game drives that do not score are left out.
            </dd>
          </div>
          <div>
            <dt>Red zone score rate</dt>
            <dd>
              Drives that start inside the opponent’s 20, or have a scrimmage play there, and end in a touchdown or a
              made field goal. A missed field goal is not a score.
            </dd>
          </div>
          <div>
            <dt>PPA per play</dt>
            <dd>
              CollegeFootballData’s season offensive predicted points added per play. If that value is missing, the lab
              uses the average PPA on scrimmage plays. Game logs always use that play average.
            </dd>
          </div>
          <div>
            <dt>Havoc rate allowed</dt>
            <dd>
              CollegeFootballData’s offensive havoc rate: the share of plays with a tackle for loss, forced fumble, or
              pass defended. Higher is worse for the offense.
            </dd>
          </div>
          <div>
            <dt>Opponent defense PPA</dt>
            <dd>
              The opponent’s defensive PPA from CollegeFootballData: predicted points added per play by offenses facing that defense. Lower is a tougher defense. The season number is the average of games that have a rating. Games against an unrated opponent are left out.
            </dd>
          </div>
        </dl>

        <h2>The peak and the findings</h2>
        <p>
          The baseline is the unweighted average of 2018, 2019, and 2020. A later season is flagged only when a measure
          is worse by at least the cutoff below, and the sample is large enough that one odd game cannot trip it.
        </p>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Finding thresholds</caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col">Flagged when</th>
                <th scope="col">Sample floor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Success rate</th>
                <td>4.0 percentage points lower</td>
                <td>100 scrimmage plays</td>
              </tr>
              <tr>
                <th scope="row">Early-down success rate</th>
                <td>4.0 percentage points lower</td>
                <td>80 early-down plays</td>
              </tr>
              <tr>
                <th scope="row">Explosive play rate</th>
                <td>3.0 percentage points lower</td>
                <td>100 scrimmage plays</td>
              </tr>
              <tr>
                <th scope="row">Points per drive</th>
                <td>0.40 lower</td>
                <td>20 drives</td>
              </tr>
              <tr>
                <th scope="row">Red zone score rate</th>
                <td>8.0 percentage points lower</td>
                <td>8 red zone trips</td>
              </tr>
              <tr>
                <th scope="row">PPA per play</th>
                <td>0.08 lower</td>
                <td>CollegeFootballData season value, or 100 scrimmage plays</td>
              </tr>
              <tr>
                <th scope="row">Havoc rate allowed</th>
                <td>3.0 percentage points higher</td>
                <td>CollegeFootballData season value</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>What this leaves out</h2>
        <p>
          The offense rates are not rewritten for the opponent. Opponent defense PPA sits beside them, and a lower
          number is a tougher defense. Garbage time can be hidden from the header. Record, season PPA, and havoc stay
          on the full game. Quarterback and play-caller are not separated. A bad defense on the other side can make an
          ordinary offense look efficient, and a brutal schedule can make a good one look worse. The rules describe
          what changed. They do not prove why.
        </p>
      </section>
    </>
  );
}
