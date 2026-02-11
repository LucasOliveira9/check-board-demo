import {
  Board,
  Client,
  TBoardEventContext,
  TBoardInjection,
  TMove,
} from "check-board";
import { config } from "../../config/config";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { events } from "../../config/events";
import AppRuntime from "../../core/app/app";
import Promotion from "../promotion/promotion";
import styles from "./board.module.css";
import BoardRuntime from "../../core/board/board";
function Index({
  app,
  client,
}: {
  app: RefObject<AppRuntime>;
  client: React.RefObject<Client | null>;
}) {
  const [isPromotion, setIsPromotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRuntimeRef = useRef<BoardRuntime>(new BoardRuntime(app));

  const injection: TBoardInjection<TBoardEventContext> = (
    ctx: TBoardEventContext,
  ) => {
    return {
      ...ctx,
      chess: app.current.getChess(),
      client,
    };
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const size = Math.min(width, height);
      app.current.getClient()?.updateSize(size);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const app_ = app.current;
    const board_ = boardRuntimeRef.current;

    board_.setOnPromotion(() => setIsPromotion(true));
    app_.addCloseMenuListener("board", () => app_.closeMenu());

    return () => {
      app_.removeCloseMenuListener("board");
    };
  }, []);

  const move = useCallback(async (args: TMove) => {
    return await boardRuntimeRef.current.move(args);
  }, []);

  const update = useCallback(() => {
    boardRuntimeRef.current.update();
  }, []);

  return (
    <div id="board" ref={containerRef} className={styles.boardWrapper}>
      {isPromotion ? (
        <div style={{ position: "relative" }}>
          <Promotion app={app} setIsPromotion={setIsPromotion} />
        </div>
      ) : (
        <></>
      )}

      <Board
        ref={client}
        config={{ ...config, events, injection }}
        onMove={move}
        onUpdate={update}
      />
    </div>
  );
}

export default Index;
