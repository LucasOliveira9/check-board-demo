import { Chess } from "chess.js";
class AppRuntime {
    boardPosition;
    loadState;
    chess = new Chess();
    client = null;
    onMount;
    onToggleAbout = () => { };
    turn = "w";
    closeMenuOff = {};
    closeMenuListeners = {};
    onCloseMenu = null;
    onClosePromotion = null;
    undoRedoStack = [];
    undoRedoIndex = -1;
    undoRedoCurrent = "current";
    emitter = null;
    didClientMount = false;
    clientMountSet = new Set();
    promotionMove = [];
    promotionTurn = "w";
    constructor(boardPosition, loadState, chess) {
        this.boardPosition = boardPosition;
        this.loadState = loadState;
        this.chess = chess;
    }
    destroy() {
        for (const key in this.closeMenuOff) {
            const off = this.closeMenuOff[key];
            off();
        }
        this.closeMenuOff = {};
        this.clientMountSet.clear();
        this.onToggleAbout = () => { };
    }
    notifyClientMounted() {
        if (this.didClientMount)
            return;
        this.didClientMount = true;
        for (const fun of this.clientMountSet.values().toArray())
            fun();
        this.clientMountSet.clear();
    }
    addOnClientMount(fun) {
        if (this.didClientMount) {
            fun();
            return () => { };
        }
        this.clientMountSet.add(fun);
        return () => {
            this.clientMountSet.delete(fun);
        };
    }
    setBoardPosition(position) {
        this.boardPosition = position;
    }
    getBoardPosition() {
        return this.boardPosition;
    }
    setLoadState(b) {
        this.loadState = b;
    }
    getLoadState() {
        return this.loadState;
    }
    setClient(client) {
        this.client = client;
        this.onClientSet();
    }
    onClientSet() {
        if (!this.client || !this.client.current)
            return;
        this.emitter = this.client.current.getEventEmitter();
        for (const key in this.closeMenuListeners)
            this.addCloseMenuListener(key, this.closeMenuListeners[key]);
        this.closeMenuListeners = {};
        return;
    }
    getClient() {
        return this.client?.current;
    }
    setChess(chess) {
        this.chess = chess;
    }
    getChess() {
        return this.chess;
    }
    onResetView(onMount) {
        this.onMount = onMount;
    }
    setOnAbout(fun) {
        this.onToggleAbout = fun;
    }
    onAbout() {
        this.onToggleAbout();
        this.closeMenu();
    }
    resetView() {
        this.onMount?.();
    }
    setTurn(turn) {
        this.turn = turn;
    }
    getTurn() {
        return this.turn;
    }
    addUndoRedo(fen) {
        if (this.undoRedoIndex < this.undoRedoStack.length - 1)
            this.undoRedoStack.splice(this.undoRedoIndex + 1);
        this.undoRedoStack.push(fen);
        this.undoRedoIndex = this.undoRedoStack.length - 1;
    }
    getUndo() {
        if (this.undoRedoIndex < 0)
            return null;
        if (this.undoRedoCurrent === "current")
            this.undoRedoCurrent = "old";
        else if (this.undoRedoIndex > 0)
            this.undoRedoIndex--;
        const fen = this.undoRedoStack[this.undoRedoIndex].old;
        return fen;
    }
    getRedo() {
        if (this.undoRedoIndex >= this.undoRedoStack.length)
            return null;
        if (this.undoRedoCurrent === "old")
            this.undoRedoCurrent = "current";
        else if (this.undoRedoIndex + 1 < this.undoRedoStack.length)
            this.undoRedoIndex++;
        const fen = this.undoRedoStack[this.undoRedoIndex].current;
        return fen;
    }
    clearUndoRedo() {
        this.undoRedoIndex = 0;
        this.undoRedoStack = [];
        this.undoRedoCurrent = "current";
    }
    setClosePromotion(fun) {
        this.onClosePromotion = fun;
    }
    setCloseMenu(fun) {
        this.onCloseMenu = fun;
    }
    addCloseMenuListener(key, fun) {
        if (!this.emitter) {
            this.closeMenuListeners[key] = fun;
            return;
        }
        const off = this.emitter.on("onPointerDown", () => {
            fun();
        });
        this.closeMenuOff[key] = off;
    }
    removeCloseMenuListener(key) {
        const off = this.closeMenuOff[key];
        off?.();
        delete this.closeMenuOff[key];
    }
    closePromotion() {
        if (this.onClosePromotion)
            this.onClosePromotion();
    }
    closeMenu() {
        this.onCloseMenu?.();
    }
    setDidClientMount(value) {
        this.didClientMount = value;
    }
    getDidClientMount() {
        return this.didClientMount;
    }
    setPromotionMove(move) {
        this.promotionMove = move;
    }
    setPromotionTurn(turn) {
        this.promotionTurn = turn;
    }
    getPromotionMove() {
        return this.promotionMove;
    }
    getPromotionTurn() {
        return this.promotionTurn;
    }
    handleFenLoading() {
        if (this.getLoadState())
            this.setLoadState(false);
    }
}
export default AppRuntime;
