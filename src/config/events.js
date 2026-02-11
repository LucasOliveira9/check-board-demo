import { runAllClearStressTests } from "../tests/test";
const events = {
    onPointerSelect: ({ y, x, squareSize, getDraw, getPiecesImage, getSquare, getPieces, size, chess, client, }) => {
        if (!getDraw)
            return;
        const draw = getDraw();
        if (!draw)
            return;
        const square = getSquare?.();
        const imagens = getPiecesImage?.();
        if (!square || !chess || !client || !getPieces)
            return;
        const poss = chess.moves({
            square: square.notation,
            verbose: true,
        });
        const possN = poss.map((x) => {
            if (x.isEnPassant())
                return {
                    to: x.to,
                    enpassant: `${x.to[0]}${x.from[1]}`,
                };
            return { to: x.to };
        });
        const drawPoss = (ctx) => {
            for (const { to } of possN) {
                const piece = client.current?.getPieceAt(to);
                if (piece)
                    continue;
                const coords = client.current?.getSquareCoords(to);
                if (coords) {
                    const { x, y } = coords;
                    const centerX = x + squareSize / 2;
                    const centerY = y + squareSize / 2;
                    const radius = squareSize * 0.1;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    ctx.fillStyle = "#8f8e8eff";
                    ctx.strokeStyle = "#130d09ff";
                    ctx.fill();
                }
            }
        };
        const drawOnDanger = (ctx) => {
            //test
            for (const { to, enpassant } of possN) {
                if (enpassant) {
                    const coords = client?.current?.getSquareCoords(enpassant);
                    if (coords) {
                        const { x, y } = coords;
                        ctx.shadowColor = "rgba(255, 5, 5, 0.8)";
                        ctx.shadowBlur = 10;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                        ctx.lineWidth = 3.5;
                        ctx.strokeStyle = "#ff0000ff";
                        ctx.lineJoin = "round";
                        ctx.beginPath();
                        ctx.strokeRect(x + 1, y + 1, squareSize - 2, squareSize - 2);
                    }
                    continue;
                }
                const piece = client.current?.getPieceAt(to);
                if (!piece)
                    continue;
                const coords = client?.current?.getSquareCoords(to);
                if (coords) {
                    const { x, y } = coords;
                    ctx.shadowColor = "rgba(255, 5, 5, 0.8)";
                    ctx.shadowBlur = 10;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    ctx.lineWidth = 3.5;
                    ctx.strokeStyle = "#ff0000ff";
                    ctx.lineJoin = "round";
                    ctx.beginPath();
                    ctx.strokeRect(x + 1, y + 1, squareSize - 2, squareSize - 2);
                }
            }
        };
        const drawSelect = (ctx) => {
            // Detecta se tocará a borda do canvas
            const isAtBorder = x <= 0 || y <= 0 || x + squareSize >= size || y + squareSize >= size;
            // Aplica ou remove sombra dependendo da borda
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = "#ffcc00";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.strokeRect(x + 2, y + 2, squareSize - 4, squareSize - 4);
        };
        const drawTest = (ctx) => {
            ctx.fillStyle = "green";
            ctx.font = "20px monospace";
            ctx.fillText("TEST", 350, 90);
        };
        const drawOtherTest = (ctx) => {
            draw({
                layer: "overlay",
                onDraw: (ctx) => runAllClearStressTests(ctx, 700, 700, imagens?.bB instanceof HTMLImageElement
                    ? Array.from(Object.values(imagens))
                    : []),
            });
        };
        draw.batch([
            {
                onDraw: drawSelect,
                layer: "underlay",
            },
            {
                onDraw: drawOnDanger,
                layer: "overlay",
            },
            {
                onDraw: drawPoss,
                layer: "underlay",
            },
        ]);
    },
    /*onPointerHover: ({ squareSize, getPiece, getPiecesImage, getDraw }) => {
      if (!getDraw) return;
      const draw = getDraw();
      if (!draw) return;
      const piece = getPiece ? getPiece() : null;
      const piecesImage = getPiecesImage ? getPiecesImage() : null;
      if (!piece || !piecesImage) return;
  
      const image = piecesImage[piece.type];
      const scale = 1.08;
  
      const drawHover = (ctx: TSafeCtx) => {
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        if (image instanceof HTMLImageElement) {
          ctx.drawImage(
            image,
            piece.x - (squareSize * (scale - 1)) / 2,
            piece.y - (squareSize * (scale - 1)) / 2,
            squareSize * scale,
            squareSize * scale
          );
        } else if (typeof image === "string") {
          ctx.fillStyle = piece.type[0] === "w" ? "#ffffffff" : "#000";
          ctx.font = `${squareSize * 0.8 * scale}px monospace`;
          let fontSize = squareSize * 0.8 * scale;
          ctx.font = `${fontSize}px monospace`;
          const textWidth = ctx.measureText(image).width;
          if (textWidth > squareSize * 0.9) {
            fontSize *= (squareSize * 0.9) / textWidth;
            ctx.font = `${fontSize}px monospace`;
          }
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(image, piece.x + squareSize / 2, piece.y + squareSize / 2);
        }
      };
      draw.group("overlay", (ctx, g) => {
        //for (const fn of hoverTest) g.draw(fn.draw);
        g.draw(drawHover);
      });
    },
    /*drawPiece: (args, time) => {
          const scale = 1.08;
          const {
            ctx,
            getPieces,
            getPieceHover,
            getPiecesImage,
            getAnimation,
            squareSize,
          } = args;
  
          if (!getPieces || !getPieceHover || !getPiecesImage || !getAnimation)
            return;
          const pieces = getPieces(),
            piecesImage = getPiecesImage(),
            pieceHover = getPieceHover(),
            animation = getAnimation();
  
          if (!pieces) return;
          const pieceToAnimate: Types.Piece.TPieceInternalRef[] = [];
          for (const [id, piece] of Object.entries(pieces)) {
            if (piece.anim) {
              pieceToAnimate.push(piece);
              continue;
            }
            if (piecesImage && id !== pieceHover) {
              const image = piecesImage[piece.type];
              if (typeof image === "string") {
                ctx.fillStyle = piece.type[0] === "w" ? "#ffffffff" : "#000000ff";
                ctx.font = "45px monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(
                  image,
                  piece.x + squareSize / 2,
                  piece.y + squareSize / 2
                );
              } else if (image instanceof HTMLImageElement) {
                if (image && image.complete && image.naturalWidth > 0)
                  ctx.drawImage(image, piece.x, piece.y, squareSize, squareSize);
              }
            }
          }
          for (const piece of pieceToAnimate) {
            ctx.save();
            const image = piecesImage && piecesImage[piece.type];
            if (image instanceof HTMLImageElement) {
              if (image && image.complete && image.naturalWidth > 0) {
                ctx.drawImage(
                  image,
                  piece.x - (squareSize * (scale - 1)) / 2,
                  piece.y - (squareSize * (scale - 1)) / 2,
                  squareSize * scale,
                  squareSize * scale
                );
              }
            } else if (typeof image === "string") {
              const image_ = image.length > 1 ? image[0] : image;
              ctx.save();
              ctx.fillStyle = piece.type[0] === "w" ? "#ffffffff" : "#000";
              ctx.font = `${squareSize * 0.8 * scale}px monospace`;
              let fontSize = squareSize * 0.8;
              ctx.font = `${fontSize}px monospace`;
              const textWidth = ctx.measureText(image_).width;
              if (textWidth > squareSize * 0.9) {
                fontSize *= (squareSize * 0.9) / textWidth;
                ctx.font = `${fontSize}px monospace`;
              }
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(
                image_,
                piece.x + squareSize / 2,
                piece.y + squareSize / 2
              );
              ctx.restore();
            }
          }
  
          /* const image = piecesImage[piece.type];
            if (image && image.complete && image.naturalWidth > 0) {
              ctx.drawImage(image, piece.x, piece.y, squareSize, squareSize);
            }
          }
      }
      },
        },*/
};
export { events };
