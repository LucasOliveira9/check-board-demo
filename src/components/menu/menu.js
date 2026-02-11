import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./menu.module.css";
import { FaBars, FaWindowClose } from "react-icons/fa";
import MenuRuntime from "../../core/menu/menu";
const Menu = ({ app }) => {
    const [open, setOpen] = useState(false);
    const [fen, setFen] = useState("");
    const [delay, setDelay] = useState("");
    const [loading, setLoading] = useState(false);
    const menuRuntimeRef = useRef(new MenuRuntime(app));
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
    return (_jsxs("div", { id: "menu", className: styles.menuAnchor, children: [_jsx("button", { className: styles.hamburger, onClick: () => {
                    setOpen((v) => {
                        return !v;
                    });
                }, children: open ? _jsx(FaWindowClose, {}) : _jsx(FaBars, {}) }), open && (_jsxs("div", { className: styles.panel, children: [_jsx("button", { onClick: onReset, children: "Reset" }), _jsxs("div", { className: `${styles.row} ${styles.row_center}`, children: [_jsx("button", { onClick: onUndoing, children: "Undo" }), _jsx("button", { onClick: onRedoing, children: "Redo" })] }), _jsxs("div", { className: `${styles.row} ${styles.row_center}`, children: [_jsx("button", { onClick: () => {
                                    app.current.getClient()?.setPieceType("string");
                                    app.current.closePromotion();
                                    setOpen(false);
                                }, children: "Text" }), _jsx("button", { onClick: () => {
                                    app.current.getClient()?.setPieceType("image");
                                    app.current.closePromotion();
                                    setOpen(false);
                                }, children: "Image" })] }), _jsx("button", { onClick: () => app.current.getClient()?.toggleHoverScaling(), children: "Scaling" }), _jsx("button", { onClick: () => app.current.getClient()?.toggleHoverHighlight(), children: "Highlight" }), _jsx("button", { onClick: () => {
                            app.current.getClient()?.flip();
                            app.current.closePromotion();
                            setOpen(false);
                        }, children: "Flip" }), _jsx("button", { onClick: onFenStreamLoaded, children: !loading ? "Load Fen Stream" : "Pause Fen Stream" }), _jsxs("div", { className: styles.row, children: [_jsx("input", { className: styles.inputFen, placeholder: "FEN", value: fen, onChange: (e) => setFen(e.target.value) }), _jsx("button", { onClick: () => {
                                    let canClear = true;
                                    app.current.closePromotion();
                                    try {
                                        app.current.getChess().load(fen);
                                        app.current
                                            .getClient()
                                            ?.loadPosition(fen.split(" ")[0], true);
                                    }
                                    catch (e) {
                                        console.log(e);
                                        canClear = false;
                                    }
                                    if (canClear) {
                                        app.current.clearUndoRedo();
                                        setOpen(false);
                                        setLoading(false);
                                    }
                                }, children: "FEN" })] }), _jsxs("div", { className: styles.row, children: [_jsx("input", { className: styles.inputDelay, placeholder: "fen stream delay (ms)", value: delay, onChange: (e) => /^\d*$/.test(e.target.value) && setDelay(e.target.value) }), _jsx("button", { onClick: () => {
                                    const n = Number(delay);
                                    if (!isNaN(n))
                                        app.current.getClient()?.setfenStreamDelay(n);
                                    setDelay("");
                                    setOpen(false);
                                }, children: "Delay" })] }), _jsx("section", { className: styles.subline }), _jsx("button", { className: styles.about, onClick: () => app.current.onAbout(), children: "About" })] }))] }));
};
export default Menu;
