import { IEventListener, TMoveResult, TPieceImage } from "check-board";
import AppRuntime from "../app/app";

class PromotionRuntime {
  private app: React.RefObject<AppRuntime>;
  private onSetIsPromotion: (() => void) | null = null;
  private height!: number;
  private width!: number;
  private images!: TPieceImage | null;
  private emitter: IEventListener | null = null;
  private canvas: React.RefObject<HTMLCanvasElement | null>;
  private emitterOff: (() => void)[] = [];
  private pieceHover: number | null = null;
  private usedKeepQuality: boolean = false;

  constructor(
    app: React.RefObject<AppRuntime>,
    canvas: React.RefObject<HTMLCanvasElement | null>,
  ) {
    this.app = app;
    this.canvas = canvas;
  }

  destroy() {
    for (const off of this.emitterOff) off();
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

  private keepQuality() {
    if (this.usedKeepQuality) return;
    const curr = this.canvas.current;
    const ctx = curr?.getContext("2d");
    if (!ctx || !curr) return;
    this.usedKeepQuality = true;
    const dpr = window.devicePixelRatio || 1;

    curr.width = this.width * dpr;
    curr.height = this.height * dpr;

    curr.style.width = `${this.width}px`;
    curr.style.height = `${this.height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  setIsPromotion(fun: (() => void) | null) {
    this.onSetIsPromotion = fun;
  }

  onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const { offsetY } = this.getCanvasCoords(e);

    const index = Math.floor(offsetY / this.width);
    const map = ["q", "r", "b", "n"] as const;
    const value = map[index];
    if (!value) return;

    this.onSetIsPromotion?.();
    if (value !== "q" && value !== "r" && value !== "b" && value !== "n") {
      this.app.current.setPromotionMove([]);
      this.app.current.setPromotionTurn("w");
      return;
    }

    const baseMove = this.app.current.getPromotionMove()[0];
    if (!baseMove) return;
    const move = { ...baseMove };
    if (!move) return;
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

  onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const { offsetY } = this.getCanvasCoords(e);

    const index = Math.floor(offsetY / this.width);
    this.pieceHover = index >= 0 && index < 4 ? index : null;
    if (this.pieceHover !== null) this.draw();
  }

  onPointerLeave() {
    this.pieceHover = null;
    this.draw();
  }

  draw() {
    this.keepQuality();
    const curr = this.canvas.current;
    const ctx = curr?.getContext("2d");
    if (!ctx || !curr) return;
    ctx.clearRect(0, 0, this.width, this.height);

    const x = 0;
    let y = 0;

    if (!this.images) return;

    const promotionColor =
      this.app.current.getPromotionTurn() === "w" ? "b" : "w";
    type TImage = "Q" | "R" | "B" | "N";
    const image: TImage[] = ["Q", "R", "B", "N"];

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
      if (img instanceof HTMLImageElement) this.drawImage(ctx, x, y, img);
      else if (typeof img === "string") this.drawText(ctx, x, y, img);
      y += this.width;
    }
  }

  private getCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return { offsetX: x, offsetY: y };
  }

  private drawImage(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    img: HTMLImageElement,
  ) {
    if (img && img.complete && img.naturalWidth > 0)
      ctx.drawImage(img, x, y, this.width, this.width);
  }

  private drawText(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    img: string,
  ) {
    const promotionColor =
      this.app.current.getPromotionTurn() === "w" ? "b" : "w";
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
