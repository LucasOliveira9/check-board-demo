import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
    const client = useRef(null);
    const app = useRef(new AppRuntime(initialPosition, false, new Chess()));
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
    return (_jsxs("div", { className: styles.app, id: "app", onPointerDown: (e) => {
            if (e.target.id === "app")
                app.current.closeMenu();
        }, children: [mount ? _jsx(Board, { client: client, app: app }) : _jsx(_Fragment, {}), about && _jsx(About, { app: app }), _jsx(Menu, { app: app })] }));
};
export default App;
