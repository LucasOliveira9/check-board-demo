import { Client, IEventListener, TMoveResult } from "check-board";
import { Chess } from "chess.js";

class AppRuntime {
  private boardPosition: string;
  private loadState: boolean;
  private chess: Chess = new Chess();
  private client: React.RefObject<Client | null> | null = null;
  private onMount?: () => void;
  private onToggleAbout: () => void = () => {};
  private turn: "w" | "b" = "w";
  private closeMenuOff: Record<string, () => void> = {};
  private closeMenuListeners: Record<string, () => void> = {};
  private onCloseMenu: (() => void) | null = null;
  private onClosePromotion: (() => void) | null = null;
  private undoRedoStack: { old: string; current: string }[] = [];
  private undoRedoIndex = -1;
  private undoRedoCurrent: "old" | "current" = "current";
  private emitter: IEventListener | null = null;
  private didClientMount: boolean = false;
  private clientMountSet: Set<() => void> = new Set();
  private promotionMove: TMoveResult = [];
  private promotionTurn: "w" | "b" = "w";

  constructor(boardPosition: string, loadState: boolean, chess: Chess) {
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
    this.onToggleAbout = () => {};
  }

  notifyClientMounted() {
    if (this.didClientMount) return;
    this.didClientMount = true;

    for (const fun of this.clientMountSet.values().toArray()) fun();
    this.clientMountSet.clear();
  }

  addOnClientMount(fun: () => void) {
    if (this.didClientMount) {
      fun();
      return () => {};
    }
    this.clientMountSet.add(fun);

    return () => {
      this.clientMountSet.delete(fun);
    };
  }

  setBoardPosition(position: string) {
    this.boardPosition = position;
  }

  getBoardPosition() {
    return this.boardPosition;
  }

  setLoadState(b: boolean) {
    this.loadState = b;
  }

  getLoadState() {
    return this.loadState;
  }

  setClient(client: React.RefObject<Client | null>) {
    this.client = client;
    this.onClientSet();
  }

  private onClientSet() {
    if (!this.client || !this.client.current) return;
    this.emitter = this.client.current.getEventEmitter();

    for (const key in this.closeMenuListeners)
      this.addCloseMenuListener(key, this.closeMenuListeners[key]);
    this.closeMenuListeners = {};
    return;
  }

  getClient() {
    return this.client?.current;
  }

  setChess(chess: Chess) {
    this.chess = chess;
  }

  getChess() {
    return this.chess;
  }

  onResetView(onMount: () => void) {
    this.onMount = onMount;
  }

  setOnAbout(fun: () => void) {
    this.onToggleAbout = fun;
  }

  onAbout() {
    this.onToggleAbout();
    this.closeMenu();
  }

  resetView() {
    this.onMount?.();
  }

  setTurn(turn: "w" | "b") {
    this.turn = turn;
  }

  getTurn() {
    return this.turn;
  }

  addUndoRedo(fen: { old: string; current: string }) {
    if (this.undoRedoIndex < this.undoRedoStack.length - 1)
      this.undoRedoStack.splice(this.undoRedoIndex + 1);
    this.undoRedoStack.push(fen);
    this.undoRedoIndex = this.undoRedoStack.length - 1;
  }

  getUndo() {
    if (this.undoRedoIndex < 0) return null;

    if (this.undoRedoCurrent === "current") this.undoRedoCurrent = "old";
    else if (this.undoRedoIndex > 0) this.undoRedoIndex--;

    const fen = this.undoRedoStack[this.undoRedoIndex].old;
    return fen;
  }

  getRedo() {
    if (this.undoRedoIndex >= this.undoRedoStack.length) return null;

    if (this.undoRedoCurrent === "old") this.undoRedoCurrent = "current";
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

  setClosePromotion(fun: (() => void) | null) {
    this.onClosePromotion = fun;
  }

  setCloseMenu(fun: (() => void) | null) {
    this.onCloseMenu = fun;
  }

  addCloseMenuListener(key: string, fun: () => void) {
    if (!this.emitter) {
      this.closeMenuListeners[key] = fun;
      return;
    }

    const off = this.emitter.on("onPointerDown", () => {
      fun();
    });
    this.closeMenuOff[key] = off;
  }

  removeCloseMenuListener(key: string) {
    const off = this.closeMenuOff[key];
    off?.();
    delete this.closeMenuOff[key];
  }

  closePromotion() {
    if (this.onClosePromotion) this.onClosePromotion();
  }

  closeMenu() {
    this.onCloseMenu?.();
  }

  setDidClientMount(value: boolean) {
    this.didClientMount = value;
  }

  getDidClientMount() {
    return this.didClientMount;
  }

  setPromotionMove(move: TMoveResult) {
    this.promotionMove = move;
  }

  setPromotionTurn(turn: "w" | "b") {
    this.promotionTurn = turn;
  }

  getPromotionMove() {
    return this.promotionMove;
  }

  getPromotionTurn() {
    return this.promotionTurn;
  }

  handleFenLoading() {
    if (this.getLoadState()) this.setLoadState(false);
  }
}

export default AppRuntime;
