class PromotionRuntime {
    app;
    onSetIsPromotion = null;
    height;
    width;
    images;
    emitter = null;
    canvas;
    emitterOff = [];
    pieceHover = null;
    usedKeepQuality = false;
    constructor(app, canvas) {
        this.app = app;
        this.canvas = canvas;
    }
    destroy() {
        for (const off of this.emitterOff)
            off();
    }
    init() {
        this.width = this.app.current.getClient()?.getSize()?.squareSize || 0;
        this.height = this.width * 4;
        this.images = this.app.current.getClient()?.getPiecesImage();
        this.emitter = this.app.current.getClient()?.getEventEmitter();
        if (this.emitter) {
            const onPointerDownOff = this.emitter.on("onPointerDown", () => {
                this.onSetIsPromotion?.();
            });
            this.emitterOff.push(onPointerDownOff);
        }
    }
    keepQuality() {
        if (this.usedKeepQuality)
            return;
        const curr = this.canvas.current;
        const ctx = curr?.getContext("2d");
        if (!ctx || !curr)
            return;
        this.usedKeepQuality = true;
        const dpr = window.devicePixelRatio || 1;
        curr.width = this.width * dpr;
        curr.height = this.height * dpr;
        curr.style.width = `${this.width}px`;
        curr.style.height = `${this.height}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }
    setIsPromotion(fun) {
        this.onSetIsPromotion = fun;
    }
    onPointerDown(e) {
        const { offsetY } = this.getCanvasCoords(e);
        const index = Math.floor(offsetY / this.width);
        const map = ["q", "r", "b", "n"];
        const value = map[index];
        if (!value)
            return;
        this.onSetIsPromotion?.();
        if (value !== "q" && value !== "r" && value !== "b" && value !== "n") {
            this.app.current.setPromotionMove([]);
            this.app.current.setPromotionTurn("w");
            return;
        }
        const baseMove = this.app.current.getPromotionMove()[0];
        if (!baseMove)
            return;
        const move = { ...baseMove };
        if (!move)
            return;
        move.promotion = value;
        const oldPosition = this.app.current.getChess().fen();
        this.app.current
            .getChess()
            .move({ from: move.from, to: move.to, promotion: value });
        const newPosition = this.app.current.getChess().fen();
        this.app.current.addUndoRedo({ old: oldPosition, current: newPosition });
        this.app.current.setPromotionMove([]);
        this.app.current.setPromotionTurn("w");
        this.app.current.handleFenLoading();
        this.app.current.getClient()?.makeMove([move]);
    }
    onPointerMove(e) {
        const { offsetY } = this.getCanvasCoords(e);
        const index = Math.floor(offsetY / this.width);
        this.pieceHover = index >= 0 && index < 4 ? index : null;
        if (this.pieceHover !== null)
            this.draw();
    }
    onPointerLeave() {
        this.pieceHover = null;
        this.draw();
    }
    draw() {
        this.keepQuality();
        const curr = this.canvas.current;
        const ctx = curr?.getContext("2d");
        if (!ctx || !curr)
            return;
        ctx.clearRect(0, 0, this.width, this.height);
        const x = 0;
        let y = 0;
        if (!this.images)
            return;
        const promotionColor = this.app.current.getPromotionTurn() === "w" ? "b" : "w";
        const image = ["Q", "R", "B", "N"];
        for (let i = 0; i < 4; i++) {
            const img = this.images[`${promotionColor}${image[i]}`];
            if (i === this.pieceHover) {
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.lineWidth = 3.5;
                ctx.strokeStyle = "#00c003";
                ctx.lineJoin = "round";
                ctx.beginPath();
                ctx.strokeRect(x + 2, y + 2, this.width - 4, this.width - 4);
            }
            if (img instanceof HTMLImageElement)
                this.drawImage(ctx, x, y, img);
            else if (typeof img === "string")
                this.drawText(ctx, x, y, img);
            y += this.width;
        }
    }
    getCanvasCoords(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return { offsetX: x, offsetY: y };
    }
    drawImage(ctx, x, y, img) {
        if (img && img.complete && img.naturalWidth > 0)
            ctx.drawImage(img, x, y, this.width, this.width);
    }
    drawText(ctx, x, y, img) {
        const promotionColor = this.app.current.getPromotionTurn() === "w" ? "b" : "w";
        ctx.fillStyle = promotionColor === "w" ? "#ffffffff" : "#000000ff";
        ctx.font = `${this.width * 0.7}px monospace`;
        let fontSize = this.width * 0.7;
        ctx.font = `${fontSize}px monospace`;
        const textWidth = ctx.measureText(img).width;
        if (textWidth > this.width * 0.9) {
            fontSize *= (this.width * 0.9) / textWidth;
            ctx.font = `${fontSize}px monospace`;
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(img, x + this.width / 2, y + this.width / 2);
    }
}
export default PromotionRuntime;
