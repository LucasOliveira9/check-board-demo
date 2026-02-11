const initialPosition = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
const config = {
    size: 640,
    isBlackView: false,
    //lightTile: "#C8A76E",
    //darkTile: "#7F532F",
    pieceConfig: { type: "image" },
    board: initialPosition,
    default: {
        onPointerHover: true,
        onPointerSelect: false,
        moveAnimation: true,
    },
    hoverConfig: {
        highlight: true,
        scaling: false,
        scaleAmount: 1.02,
    },
};
export { config, initialPosition };
