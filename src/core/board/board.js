class BoardRuntime {
    app;
    onPromotion = () => { };
    constructor(app) {
        this.app = app;
    }
    async move(args) {
        const { from, to, piece } = args;
        const emitter = this.app.current.getClient()?.getEventEmitter();
        let move = null;
        const oldPosition = this.app.current.getChess().fen();
        const cancelled = { status: false, result: [] };
        let aborted = false;
        const off = emitter.current?.on("onMoveAbort", () => {
            aborted = true;
        });
        try {
            /*const delay = async () => {
              return new Promise<void>((resolve) => {
                const timeout = setTimeout(resolve, 9000);
                emitter.current?.once("onMoveAbort", () => {
                  clearTimeout(timeout);
                  resolve();
                });
              });
            };*/
            try {
                if (aborted)
                    return cancelled;
                if (piece.type[1] === "P") {
                    if (from[1] === "7" || from[1] === "2") {
                        if (to[1] === "1" || to[1] === "8") {
                            move = this.app.current
                                .getChess()
                                .move({ from, to, promotion: "q" });
                        }
                    }
                }
                if (move === null)
                    move = this.app.current.getChess().move({ from, to });
            }
            catch (e) {
                return cancelled;
            }
            const response = [];
            const turn = this.app.current.getChess().turn() === "w";
            if (move?.isKingsideCastle()) {
                response.push(turn
                    ? { from: "e8", to: "g8", captured: [] }
                    : { from: "e1", to: "g1", captured: [] });
                response.push(turn
                    ? { from: "h8", to: "f8", captured: [] }
                    : { from: "h1", to: "f1", captured: [] });
            }
            else if (move?.isQueensideCastle()) {
                response.push(turn
                    ? { from: "e8", to: "c8", captured: [] }
                    : { from: "e1", to: "c1", captured: [] });
                response.push(turn
                    ? { from: "a8", to: "d8", captured: [] }
                    : { from: "a1", to: "d1", captured: [] });
            }
            else if (move?.isEnPassant()) {
                const rank = turn
                    ? parseInt(to.charAt(1)) + 1
                    : parseInt(to.charAt(1)) - 1;
                const enPassant = `${to.charAt(0)}${rank}`;
                response.push({ from, to, captured: [enPassant] });
            }
            else
                response.push({
                    from,
                    to,
                    captured: [to],
                    promotion: move?.isPromotion() ? "q" : undefined,
                });
            if (move?.isPromotion()) {
                aborted = true;
                this.app.current.setPromotionMove([{ from, to, captured: [to] }]);
                this.onPromotion();
                this.app.current.setPromotionTurn(this.app.current.getChess().turn());
            }
            if (aborted) {
                this.app.current.getChess().load(oldPosition);
                return cancelled;
            }
            this.app.current.addUndoRedo({
                old: oldPosition,
                current: this.app.current.getChess().fen(),
            });
            this.app.current.handleFenLoading();
            return {
                status: true,
                result: response,
            };
        }
        finally {
            if (off)
                off();
        }
    }
    setOnPromotion(fun) {
        this.onPromotion = fun;
    }
    update() {
        const board_ = this.app.current.getClient()?.getBoard();
        if (!board_)
            return;
        const turn_ = this.app.current.getTurn() === "w" ? "b" : "w";
        this.app.current.setBoardPosition(board_);
        this.app.current.setTurn(turn_);
        if (this.app.current.getLoadState()) {
            //this.app.current.setLoadState(false);
            this.app.current
                .getChess()
                .load(`${this.app.current.getBoardPosition()} w - - 0 1`, {
                skipValidation: true,
            });
        }
    }
}
export default BoardRuntime;
