import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Board, } from "check-board";
import { config } from "../../config/config";
import { useCallback, useEffect, useRef, useState } from "react";
import { events } from "../../config/events";
import Promotion from "../promotion/promotion";
import styles from "./board.module.css";
import BoardRuntime from "../../core/board/board";
function Index({ app, client, }) {
    const [isPromotion, setIsPromotion] = useState(false);
    const containerRef = useRef(null);
    const boardRuntimeRef = useRef(new BoardRuntime(app));
    const injection = (ctx) => {
        return {
            ...ctx,
            chess: app.current.getChess(),
            client,
        };
    };
    useEffect(() => {
        const el = containerRef.current;
        if (!el)
            return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            const size = Math.min(width, height);
            app.current.getClient()?.updateSize(size);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        const app_ = app.current;
        const board_ = boardRuntimeRef.current;
        board_.setOnPromotion(() => setIsPromotion(true));
        app_.addCloseMenuListener("board", () => app_.closeMenu());
        return () => {
            app_.removeCloseMenuListener("board");
        };
    }, []);
    const move = useCallback(async (args) => {
        return await boardRuntimeRef.current.move(args);
    }, []);
    const update = useCallback(() => {
        boardRuntimeRef.current.update();
    }, []);
    return (_jsxs("div", { id: "board", ref: containerRef, className: styles.boardWrapper, children: [isPromotion ? (_jsx("div", { style: { position: "relative" }, children: _jsx(Promotion, { app: app, setIsPromotion: setIsPromotion }) })) : (_jsx(_Fragment, {})), _jsx(Board, { ref: client, config: { ...config, events, injection }, onMove: move, onUpdate: update })] }));
}
export default Index;
