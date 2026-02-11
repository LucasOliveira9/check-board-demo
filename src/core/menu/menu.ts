import { initialPosition } from "../../config/config";
import { testFen } from "../../tests/test";
import AppRuntime from "../app/app";

class MenuRuntime {
  private app: React.RefObject<AppRuntime>;
  private undoing = false;
  private redoing = false;
  private onSetLoading: (loading: boolean) => void = () => {};
  private loadingListenerOff: () => void = () => {};

  constructor(app: React.RefObject<AppRuntime>) {
    this.app = app;
  }

  destroy() {
    this.loadingListenerOff();
    this.loadingListenerOff = () => {};
  }

  async onUndo() {
    this.app.current.closePromotion();
    if (this.undoing) return;
    this.undoing = true;

    try {
      const res = await this.app.current.getClient()?.undo();
      if (!res) return;
      const chess = this.app.current.getChess();
      const fen = this.app.current.getUndo();

      if (fen) chess.load(fen);
    } finally {
      this.undoing = false;
    }
  }

  async onRedo() {
    this.app.current.closePromotion();
    if (this.redoing) return;
    this.redoing = true;
    try {
      const res = await this.app.current.getClient()?.redo();
      if (!res) return;
      const chess = this.app.current.getChess();
      const fen = this.app.current.getRedo();

      if (fen) chess.load(fen);
    } finally {
      this.redoing = false;
    }
  }

  onReset() {
    this.app.current.getChess().reset();
    this.app.current.setBoardPosition(initialPosition);
    this.app.current.getClient()?.loadPosition(initialPosition, true);
    this.app.current.closePromotion();
    this.app.current.clearUndoRedo();
    this.app.current.closeMenu();
    this.onSetLoading(false);
  }

  async handleFenStreamAction() {
    this.app.current.closeMenu();
    this.app.current.closePromotion();

    const isLoadingFenStream =
      this.app.current.getClient()?.getIsLoadingFenStream() || null;

    if (isLoadingFenStream) {
      const isPaused = await this.onPause();
      this.onSetLoading(isPaused);
      return;
    }

    const eventEmitter = this.app.current.getClient()?.getEventEmitter();
    this.loadingListenerOff = eventEmitter?.on("onFenStreamLoaded", () => {
      this.onSetLoading(false);
      this.app.current.setLoadState(false);
      this.loadingListenerOff();
    });

    this.app.current.setLoadState(true);
    this.app.current.getClient()?.loadFenStream(testFen.slice(0, 50));
    this.app.current.clearUndoRedo();
    this.onSetLoading(true);
  }

  setOnSetLoading(fun: (loading: boolean) => void) {
    this.onSetLoading = fun;
  }

  handleBugReport() {
    const url =
      "https://github.com/LucasOliveira9/check-board-demo/issues/new?template=bug_report.md&title=[BUG]+";

    window.open(url, "_blank", "noopener,noreferrer");
  }

  private async onPause() {
    const isPaused = await this.app.current.getClient()?.togglePause();
    this.app.current.setLoadState(true);
    this.app.current.closePromotion();
    return isPaused !== null && isPaused !== undefined ? isPaused : false;
  }
}

export default MenuRuntime;
