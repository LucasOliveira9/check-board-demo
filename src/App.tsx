import { Client } from "check-board";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { initialPosition } from "./config/config";
import Board from "./components/board/board";
import AppRuntime from "./core/app/app";
import Menu from "./components/menu/menu";
import styles from "./App.module.css";
import About from "./components/about/about";

const App = () => {
  const [mount, setMount] = useState(true);
  const [about, setAbout] = useState(false);
  const client = useRef<Client>(null);
  const app = useRef<AppRuntime>(
    new AppRuntime(initialPosition, false, new Chess()),
  );

  useEffect(() => {
    const app_ = app.current;
    app_.onResetView(() => setMount((value) => !value));
    app_.addCloseMenuListener("app", () => app_.closeMenu());

    client.current?.mount(() => {
      app_.setDidClientMount(true);
      app_.setClient(client);
      app_.setOnAbout(() => setAbout((v) => !v));
      app_.notifyClientMounted();
    });
    return () => {
      app_.destroy();
    };
  }, []);

  return (
    <div
      className={styles.app}
      id="app"
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).id === "app") app.current.closeMenu();
      }}
    >
      {mount ? <Board client={client} app={app} /> : <></>}
      {about && <About app={app} />}
      <Menu app={app} />
    </div>
  );
};
export default App;
