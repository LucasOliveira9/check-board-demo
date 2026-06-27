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
  const outerRef = useRef<HTMLDivElement>(null);
  const boardRuntimeRef = useRef<BoardRuntime>(new BoardRuntime(app));
  const lastSize = useRef(0);

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
    const out = outerRef.current;
    const container = containerRef.current;

    if (!container || !out) return;

    const observer = new ResizeObserver(() => {
      const raw = out.getBoundingClientRect().width;
      const size = Math.floor(raw / 8) * 8;

      if (size === lastSize.current) return;
      lastSize.current = size;

      container.style.width = `${size}px`;
      container.style.height = `${size}px`;
      app.current.getClient()?.updateSize(size);
    });

    observer.observe(out);

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
    <div ref={outerRef} className={styles.boardOuter}>
      <div id="board" ref={containerRef} className={styles.boardWrapper}>
        {isPromotion && <Promotion app={app} setIsPromotion={setIsPromotion} />}

        <Board
          ref={client}
          config={{ ...config, events, injection }}
          onMove={move}
          onUpdate={update}
        />
      </div>
    </div>
  );
}

export default Index;
