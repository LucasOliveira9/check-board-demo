import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const outerRef = useRef(null);
    const boardRuntimeRef = useRef(new BoardRuntime(app));
    const lastSize = useRef(0);
    const injection = (ctx) => {
        return {
            ...ctx,
            chess: app.current.getChess(),
            client,
        };
    };
    useEffect(() => {
        const out = outerRef.current;
        const container = containerRef.current;
        if (!container || !out)
            return;
        const observer = new ResizeObserver(() => {
            const raw = out.getBoundingClientRect().width;
            const size = Math.floor(raw / 8) * 8;
            if (size === lastSize.current)
                return;
            lastSize.current = size;
            container.style.width = `${size}px`;
            container.style.height = `${size}px`;
            console.log("board ->", size, Math.floor(size));
            app.current.getClient()?.updateSize(size);
        });
        observer.observe(out);
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
    return (_jsx("div", { ref: outerRef, className: styles.boardOuter, children: _jsxs("div", { id: "board", ref: containerRef, className: styles.boardWrapper, children: [isPromotion && _jsx(Promotion, { app: app, setIsPromotion: setIsPromotion }), _jsx(Board, { ref: client, config: { ...config, events, injection }, onMove: move, onUpdate: update })] }) }));
}
export default Index;
