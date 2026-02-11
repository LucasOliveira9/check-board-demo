import AppRuntime from "../../core/app/app";
import styles from "./about.module.css";
import { FaWindowClose } from "react-icons/fa";

const About = ({ app }: { app: React.RefObject<AppRuntime> }) => {
  return (
    <div
      className={styles.container}
      id="about-container"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).id === "about-container")
          app.current.onAbout();
      }}
    >
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <h1>About the Demo</h1>
          <p className={styles.subtitle}>
            Board Library · Demo & Study Project
          </p>
          <FaWindowClose
            className={styles.close}
            onClick={() => app.current.onAbout()}
          />
        </header>

        <div className={styles.scroll}>
          <section>
            <h2>What is this?</h2>
            <p>
              This is a{" "}
              <strong>
                demo of a board library currently under development
              </strong>
              . The library focuses on handling the{" "}
              <strong>visual representation and interaction of a board</strong>,
              acting purely as a display layer.
            </p>
            <p>
              It is <strong>agnostic</strong> and does{" "}
              <strong>not implement game rules</strong>. Any rule system that
              depends on an 8×8 board can be built on top of it.
            </p>
            <p>
              This demo consumes the library and demonstrates how it can be
              integrated and customized.
            </p>
          </section>

          <section>
            <h2>Project Goals</h2>
            <ul>
              <li>Provide a functional board display library</li>
              <li>Explore architecture and decoupling</li>
              <li>Practice engine-like design outside UI frameworks</li>
              <li>
                Serve primarily as a <strong>study and practice project</strong>
              </li>
            </ul>
          </section>

          <section>
            <h2>Available Features</h2>

            <div className={styles.feature}>
              <h3>Reset</h3>
              <p>Resets the board to its initial state.</p>
            </div>

            <div className={styles.feature}>
              <h3>Undo / Redo</h3>
              <p>
                Navigate backward and forward through moves. Loading a new FEN,
                reset, or FEN stream clears history.
              </p>
            </div>

            <div className={styles.feature}>
              <h3>Text / Image</h3>
              <p>
                Switch piece rendering mode at any time, including during FEN
                streams.
              </p>
            </div>

            <div className={styles.feature}>
              <h3>Scaling / Highlight</h3>
              <p>Toggle board scaling and square highlighting.</p>
            </div>

            <div className={styles.feature}>
              <h3>Flip</h3>
              <p>Rotates the board orientation.</p>
            </div>

            <div className={styles.feature}>
              <h3>Load FEN Stream</h3>
              <p>
                Loads 1167 positions. More than 1000 valid FENs will be
                rendered. Pause, interact, resume — resuming discards manual
                moves.
              </p>
            </div>

            <div className={styles.feature}>
              <h3>FEN Input</h3>
              <p>Loads a specific position from a valid FEN string.</p>
            </div>

            <div className={styles.feature}>
              <h3>Delay</h3>
              <p>Defines the delay between positions during the FEN stream.</p>
            </div>
          </section>

          <footer className={styles.footer}>
            <p>
              This project is evolving and exists primarily for
              <strong> learning, experimentation and practice</strong>.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default About;
