import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import AppRuntime from "../../core/app/app";
import styles from "./menu.module.css";
import { FaBars, FaWindowClose } from "react-icons/fa";
import MenuRuntime from "../../core/menu/menu";

const Menu = ({ app }: { app: RefObject<AppRuntime> }) => {
  const [open, setOpen] = useState(false);
  const [fen, setFen] = useState("");
  const [delay, setDelay] = useState("");
  const [loading, setLoading] = useState(false);
  const menuRuntimeRef = useRef<MenuRuntime>(new MenuRuntime(app));

  useEffect(() => {
    const app_ = app.current;
    const menu_ = menuRuntimeRef.current;
    menu_.setOnSetLoading((loading) => {
      setLoading(loading);
    });
    app_.setCloseMenu(() => setOpen(false));
    return () => {
      app_.setCloseMenu(null);
      menu_.destroy();
    };
  }, []);

  const onUndoing = useCallback(() => {
    menuRuntimeRef.current.onUndo();
  }, []);

  const onRedoing = useCallback(() => {
    menuRuntimeRef.current.onRedo();
  }, []);

  const onReset = useCallback(() => {
    menuRuntimeRef.current.onReset();
  }, []);

  const onFenStreamLoaded = useCallback(() => {
    menuRuntimeRef.current.handleFenStreamAction();
  }, []);

  const handleReportBug = useCallback(() => {
    menuRuntimeRef.current.handleBugReport();
  }, []);

  return (
    <div id="menu" className={styles.menuAnchor}>
      {/* Hamburger */}
      <button
        className={styles.hamburger}
        onClick={() => {
          setOpen((v) => {
            return !v;
          });
        }}
      >
        {open ? <FaWindowClose /> : <FaBars />}
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.panel}>
          {/*<button onClick={() => app.current.resetview()}>Mount</button>*/}
          <button onClick={onReset}>Reset</button>

          <div className={`${styles.row} ${styles.row_center}`}>
            <button onClick={onUndoing}>Undo</button>
            <button onClick={onRedoing}>Redo</button>
          </div>

          <div className={`${styles.row} ${styles.row_center}`}>
            <button
              onClick={() => {
                app.current.getClient()?.setPieceType("string");
                app.current.closePromotion();
                setOpen(false);
              }}
            >
              Text
            </button>
            <button
              onClick={() => {
                app.current.getClient()?.setPieceType("image");
                app.current.closePromotion();
                setOpen(false);
              }}
            >
              Image
            </button>
          </div>

          <button onClick={() => app.current.getClient()?.toggleHoverScaling()}>
            Scaling
          </button>
          <button
            onClick={() => app.current.getClient()?.toggleHoverHighlight()}
          >
            Highlight
          </button>

          <button
            onClick={() => {
              app.current.getClient()?.flip();
              app.current.closePromotion();
              setOpen(false);
            }}
          >
            Flip
          </button>
          <button onClick={onFenStreamLoaded}>
            {!loading ? "Load Fen Stream" : "Pause Fen Stream"}
          </button>

          <div className={styles.row}>
            <input
              className={styles.inputFen}
              placeholder="FEN"
              value={fen}
              onChange={(e) => setFen(e.target.value)}
            />
            <button
              onClick={() => {
                let canClear = true;
                app.current.closePromotion();
                try {
                  app.current.getChess().load(fen);
                  app.current
                    .getClient()
                    ?.loadPosition(fen.split(" ")[0], true);
                } catch (e) {
                  console.log(e);
                  canClear = false;
                }
                if (canClear) {
                  app.current.clearUndoRedo();
                  setOpen(false);
                  setLoading(false);
                }
              }}
            >
              FEN
            </button>
          </div>
          <div className={styles.row}>
            <input
              className={styles.inputDelay}
              placeholder="fen stream delay (ms)"
              value={delay}
              onChange={(e) =>
                /^\d*$/.test(e.target.value) && setDelay(e.target.value)
              }
            />
            <button
              onClick={() => {
                const n = Number(delay);
                if (!isNaN(n)) app.current.getClient()?.setfenStreamDelay(n);
                setDelay("");
                setOpen(false);
              }}
            >
              Delay
            </button>
          </div>

          <section className={styles.subline}></section>

          <button
            className={styles.about}
            onClick={() => app.current.onAbout()}
          >
            About
          </button>

          <button
            className={styles.about}
            onClick={handleReportBug}
            aria-label="Report a bug on GitHub"
          >
            Report Bug
          </button>
        </div>
      )}
    </div>
  );
};

export default Menu;
