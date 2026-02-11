import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useRef } from "react";
import PromotionRuntime from "../../core/promotion/promotion";
const Promotion = ({ app, setIsPromotion, }) => {
    //rnbqkbnr/pPpppppp/8/8/8/8/PPPPPPpP/RNBQKBNR w KQkq - 0 1
    const canvasRef = useRef(null);
    const promotionRef = useRef(new PromotionRuntime(app, canvasRef));
    const width = app.current.getClient()?.getSize()?.squareSize || 0;
    const height = width * 4;
    const coords = app.current
        .getClient()
        ?.getSquareCoords(app.current.getPromotionMove()[0].to) || { x: 0, y: 0 };
    useEffect(() => {
        const promotion_ = promotionRef.current;
        const app_ = app.current;
        const off = app_.addOnClientMount(() => {
            promotion_.init();
        });
        promotionRef.current.draw();
        app_.setClosePromotion(() => setIsPromotion(false));
        promotion_.setIsPromotion(() => setIsPromotion(false));
        return () => {
            off();
            promotion_.destroy();
            app_.setClosePromotion(null);
        };
    }, [app, setIsPromotion]);
    const handlePointerDown = useCallback((e) => {
        promotionRef.current?.onPointerDown(e);
    }, [promotionRef]);
    const handlePointerMove = useCallback((e) => {
        promotionRef.current?.onPointerMove(e);
    }, [promotionRef]);
    const handlePointerLeave = useCallback(() => {
        promotionRef.current?.onPointerLeave();
    }, [promotionRef]);
    return (_jsx("div", { id: "promotion", style: {
            position: "absolute",
            top: coords.y <= 0 ? coords.y : coords.y - width * 3,
            left: coords.x,
            width: `${width}px`,
            zIndex: 3,
            cursor: "pointer",
        }, children: _jsx("canvas", { ref: canvasRef, width: width, height: height, style: {
                backgroundColor: "#51312c",
            }, onPointerDown: (e) => handlePointerDown(e), onPointerMove: (e) => handlePointerMove(e), onPointerLeave: () => handlePointerLeave() }) }));
};
export default Promotion;
