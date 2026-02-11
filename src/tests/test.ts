import { TSafeCtx } from "check-board";

function makeRng(seed = Date.now()) {
  let s = seed | 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function randBetween(rng: () => number, a: number, b: number) {
  return rng() * (b - a) + a;
}

async function loadImages(urls: string[]): Promise<HTMLImageElement[]> {
  const load = (url: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = (e) => rej(e);
      img.src = url;
    });
  const arr: HTMLImageElement[] = [];
  for (const u of urls) {
    try {
      arr.push(await load(u));
    } catch {
      // ignore failed images, continue
    }
  }
  return arr;
}

/* -------------------------
   1) Path2D Extreme
   - dozens of Path2D types: polylines, bezier, quadratic, complex polygons.
   ------------------------- */
function drawPath2DStress(
  ctx: TSafeCtx,
  width: number,
  height: number,
  seed = 12345,
  intensity = 1
) {
  const rng = makeRng(seed);
  const loops = Math.floor(200 * intensity);
  for (let i = 0; i < loops; i++) {
    const p = new Path2D();
    const cx = randBetween(rng, 0, width);
    const cy = randBetween(rng, 0, height);
    const r = randBetween(rng, 5, Math.max(width, height) * 0.25);
    // polygon-ish base
    const verts = 3 + Math.floor(randBetween(rng, 3, 12));
    p.moveTo(cx + r * Math.cos(0), cy + r * Math.sin(0));
    for (let v = 1; v <= verts; v++) {
      const a = (v / verts) * Math.PI * 2;
      // jitter radius per vertex
      const rr = r * (0.4 + rng() * 1.8);
      p.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    // add some bezier/quadratic splines
    if (rng() > 0.5) {
      p.moveTo(cx, cy);
      p.bezierCurveTo(
        cx + r * 0.3,
        cy - r,
        cx - r * 0.7,
        cy + r * 0.7,
        cx + r,
        cy + r * 0.2
      );
    } else {
      p.moveTo(cx, cy);
      p.quadraticCurveTo(cx + r, cy - r * 0.6, cx + r * 0.9, cy);
    }

    ctx.lineWidth = Math.max(0.4, randBetween(rng, 0.5, 10));
    ctx.strokeStyle = `rgba(${Math.floor(
      randBetween(rng, 0, 255)
    )},${Math.floor(randBetween(rng, 0, 255))},${Math.floor(
      randBetween(rng, 0, 255)
    )},${randBetween(rng, 0.2, 1)})`;
    ctx.fillStyle = `rgba(${Math.floor(randBetween(rng, 0, 255))},${Math.floor(
      randBetween(rng, 0, 255)
    )},${Math.floor(randBetween(rng, 0, 255))},${randBetween(rng, 0.05, 0.9)})`;

    // randomly fill or stroke or both
    if (rng() > 0.33) ctx.fill(p);
    if (rng() > 0.2) ctx.stroke(p);
  }
}

/* -------------------------
   2) HtmlImageElement stress
   - many scaled draws, tiled draws, tiny samples, large crops
   ------------------------- */
function drawImageStress(
  ctx: TSafeCtx,
  width: number,
  height: number,
  images: HTMLImageElement[],
  seed = 777,
  intensity = 1
) {
  const rng = makeRng(seed);
  if (!images || images.length === 0) return;

  // a) big full-image draws (scaled to varying sizes)
  for (let i = 0; i < Math.floor(60 * intensity); i++) {
    const img = images[Math.floor(rng() * images.length)];
    const sx = Math.floor(randBetween(rng, 0, img.width * 0.8));
    const sy = Math.floor(randBetween(rng, 0, img.height * 0.8));
    const sw = Math.floor(
      randBetween(rng, Math.max(8, img.width * 0.05), img.width - sx)
    );
    const sh = Math.floor(
      randBetween(rng, Math.max(8, img.height * 0.05), img.height - sy)
    );
    const dx = randBetween(rng, -width * 0.1, width * 1.1); // allow overflow
    const dy = randBetween(rng, -height * 0.1, height * 1.1);
    const dw = randBetween(rng, 8, width * (0.6 + rng() * 1.2));
    const dh = randBetween(rng, 8, height * (0.6 + rng() * 1.2));
    // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    try {
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    } catch {
      // some images may be tainted or invalid - ignore
    }
  }

  // b) tiled micro-tiles (tiny draws)
  for (let i = 0; i < Math.floor(400 * intensity); i++) {
    const img = images[Math.floor(rng() * images.length)];
    const dx = randBetween(rng, 0, width);
    const dy = randBetween(rng, 0, height);
    const s = Math.max(1, Math.floor(randBetween(rng, 1, 24)));
    try {
      ctx.drawImage(
        img,
        0,
        0,
        Math.min(img.width, s),
        Math.min(img.height, s),
        dx,
        dy,
        s,
        s
      );
    } catch {
      console.warn("s");
    }
  }

  // c) overlapped semi-opaque images (many)
  for (let i = 0; i < Math.floor(80 * intensity); i++) {
    const img = images[Math.floor(rng() * images.length)];
    const dx = randBetween(rng, -width * 0.2, width * 1.2);
    const dy = randBetween(rng, -height * 0.2, height * 1.2);
    const dw = randBetween(rng, 40, width * 0.8);
    const dh = randBetween(rng, 40, height * 0.8);
    // simulate alpha by using partially transparent source (we cannot set globalAlpha)
    // achieve by drawing small semitransparent rectangles underneath first
    ctx.fillStyle = `rgba(${Math.floor(randBetween(rng, 0, 255))},${Math.floor(
      randBetween(rng, 0, 255)
    )},${Math.floor(randBetween(rng, 0, 255))},${randBetween(rng, 0.06, 0.4)})`;
    ctx.fillRect(dx, dy, Math.min(dw, width), Math.min(dh, height));
    try {
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      console.warn("d");
    }
  }
}

/* -------------------------
   3) Text stress (many fonts, sizes, overlapping, subpixel)
   ------------------------- */
function drawTextStress(
  ctx: TSafeCtx,
  width: number,
  height: number,
  seed = 999,
  intensity = 1
) {
  const rng = makeRng(seed);
  const phrases = ["TEST", "CLEAR", "STRESS", "αβγ", "🚀", "🔥", "0123456789"];
  for (let i = 0; i < Math.floor(2000 * intensity); i++) {
    const fontSize = Math.max(8, Math.floor(randBetween(rng, 8, 96)));
    ctx.font = `${fontSize}px ${
      rng() > 0.5 ? "monospace" : rng() > 0.5 ? "serif" : "sans-serif"
    }`;
    ctx.fillStyle = `rgba(${Math.floor(randBetween(rng, 0, 255))},${Math.floor(
      randBetween(rng, 0, 255)
    )},${Math.floor(randBetween(rng, 0, 255))},${randBetween(rng, 0.2, 1)})`;
    const text = phrases[Math.floor(rng() * phrases.length)];
    ctx.fillText(
      text,
      randBetween(rng, -20, width + 20),
      randBetween(rng, -20, height + 20)
    );
    if (rng() > 0.7) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = Math.max(0.5, randBetween(rng, 0.3, 3));
      ctx.strokeText(
        text,
        randBetween(rng, -20, width + 20),
        randBetween(rng, -20, height + 20)
      );
    }
  }
}

/* -------------------------
   4) Shape stress: fillRect, strokeRect, arcs, dense clusters
   ------------------------- */
function drawShapesStress(
  ctx: TSafeCtx,
  width: number,
  height: number,
  seed = 555,
  intensity = 1
) {
  const rng = makeRng(seed);
  // large shapes
  for (let i = 0; i < Math.floor(800 * intensity); i++) {
    ctx.fillStyle = `rgba(${Math.floor(randBetween(rng, 0, 255))},${Math.floor(
      randBetween(rng, 0, 255)
    )},${Math.floor(randBetween(rng, 0, 255))},${randBetween(
      rng,
      0.05,
      0.95
    )})`;
    ctx.strokeStyle = `rgba(${Math.floor(
      randBetween(rng, 0, 255)
    )},${Math.floor(randBetween(rng, 0, 255))},${Math.floor(
      randBetween(rng, 0, 255)
    )},${randBetween(rng, 0.1, 1)})`;
    ctx.lineWidth = Math.max(0.5, randBetween(rng, 0.5, 12));
    const x = randBetween(rng, -50, width + 50);
    const y = randBetween(rng, -50, height + 50);
    const w = randBetween(rng, 4, Math.max(4, width * 0.5));
    const h = randBetween(rng, 4, Math.max(4, height * 0.5));
    if (rng() > 0.4) ctx.fillRect(x, y, w, h);
    if (rng() > 0.45) ctx.strokeRect(x, y, w, h);

    // arcs
    if (rng() > 0.6) {
      ctx.beginPath();
      ctx.arc(
        x + w / 2,
        y + h / 2,
        Math.max(1, randBetween(rng, 3, Math.min(width, height) * 0.25)),
        0,
        Math.PI * 2
      );
      if (rng() > 0.5) ctx.fill();
      else ctx.stroke();
    }
  }

  // dense clusters (micro shapes)
  for (let i = 0; i < Math.floor(20000 * intensity); i++) {
    ctx.fillStyle = `rgba(${Math.floor(randBetween(rng, 0, 255))},${Math.floor(
      randBetween(rng, 0, 255)
    )},${Math.floor(randBetween(rng, 0, 255))},${randBetween(rng, 0.25, 1)})`;
    const sx = Math.floor(randBetween(rng, 0, width));
    const sy = Math.floor(randBetween(rng, 0, height));
    const s = Math.floor(randBetween(rng, 1, 4));
    ctx.fillRect(sx, sy, s, s);
  }
}

/* -------------------------
   5) Pixel ops (getImageData/putImageData) - heavy but allowed
   - generate noisy ImageData blocks and stamp them around
   ------------------------- */
function drawPixelBlockStress(
  ctx: TSafeCtx,
  width: number,
  height: number,
  seed = 4242,
  intensity = 1
) {
  const rng = makeRng(seed);
  const blocks = Math.floor(300 * intensity);
  for (let b = 0; b < blocks; b++) {
    const bw = Math.max(8, Math.floor(randBetween(rng, 8, 120)));
    const bh = Math.max(8, Math.floor(randBetween(rng, 8, 120)));
    const img = ctx.createImageData(bw, bh);
    // fill random rgba
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = Math.floor(randBetween(rng, 0, 255));
      img.data[i + 1] = Math.floor(randBetween(rng, 0, 255));
      img.data[i + 2] = Math.floor(randBetween(rng, 0, 255));
      img.data[i + 3] = Math.floor(randBetween(rng, 60, 255));
    }
    const dx = Math.floor(randBetween(rng, -20, width + 20));
    const dy = Math.floor(randBetween(rng, -20, height + 20));
    ctx.putImageData(img, dx, dy);
  }
}

/* -------------------------
   6) Patterns from images (createPattern + fillRect) - safe
   ------------------------- */
function drawPatternStress(
  ctx: TSafeCtx,
  width: number,
  height: number,
  images: HTMLImageElement[],
  seed = 1337,
  intensity = 1
) {
  const rng = makeRng(seed);
  if (!images || images.length === 0) return;
  for (let i = 0; i < Math.floor(120 * intensity); i++) {
    const img = images[Math.floor(rng() * images.length)];
    try {
      const p = ctx.createPattern(img, "repeat");
      if (!p) continue;
      ctx.fillStyle = p as unknown as string; // TS typing; runtime accepts CanvasPattern
      const x = Math.floor(randBetween(rng, -50, width));
      const y = Math.floor(randBetween(rng, -50, height));
      const w = Math.floor(randBetween(rng, 8, Math.max(8, width * 0.8)));
      const h = Math.floor(randBetween(rng, 8, Math.max(8, height * 0.8)));
      ctx.fillRect(x, y, w, h);
    } catch {
      // some images might be tainted - ignore
    }
  }
}

/* -------------------------
   Master runner: draws everything (all crazy cases)
   ------------------------- */
async function runAllClearStressTests(
  ctx: TSafeCtx,
  width: number,
  height: number,
  images: HTMLImageElement[] = [],
  opts?: { seed?: number; intensity?: number }
) {
  const seed = opts?.seed ?? Date.now() & 0xffff;
  const intensity = opts?.intensity ?? 1;
  console.log(images);
  // run each test with slight different seeds for coverage
  drawPath2DStress(ctx, width, height, seed ^ 0x1234, intensity);
  drawImageStress(ctx, width, height, images, seed ^ 0x2222, intensity);
  drawTextStress(ctx, width, height, seed ^ 0x3333, intensity);
  drawShapesStress(ctx, width, height, seed ^ 0x4444, intensity);
  drawPixelBlockStress(ctx, width, height, seed ^ 0x5555, intensity);
  drawPatternStress(ctx, width, height, images, seed ^ 0x6666, intensity);

  // optionally run one more pass of micro shapes for maximum coverage
  drawShapesStress(
    ctx,
    width,
    height,
    seed ^ 0x7777,
    Math.max(0.5, intensity * 0.6)
  );
}

const testFen = [
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R",
  "rnbqkb1r/pppppppp/5n2/8/2B5/8/PPPPPPPP/RNBQK1NR",
  "rnbqkbnr/1pp1pppp/p7/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R",
  "r1bqk1nr/pppp1ppp/2n5/4p3/4P3/1BN5/PPPP1PPP/R1BQK2R",
  "rnb1kbnr/ppppqppp/8/4p3/8/3P1N2/PPP1PPPP/RNBQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/8/8/4PN2/PPPP1PPP/RNBQKB1R",
  "rnbq1bnr/pp1pkppp/2p5/8/2B5/5N2/PPPPPPPP/RNBQK2R",
  "r1bqkbnr/ppp1pppp/2n5/3p4/3P4/2P2N2/PP2PPPP/RNBQKB1R",
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR",
  "rnb1kbnr/ppppqppp/8/4p3/1P6/5N2/P1PPPPPP/RNBQKB1R",
  "rnbqk1nr/ppp2ppp/3b4/3pp3/8/3P1N2/PPP1PPPP/RNBQKB1R",
  "r1bqkbnr/pppppppp/2n5/8/4P3/2N5/PPPP1PPP/R1BQKBNR",
  "rn1qkbnr/ppp1pppp/3p4/8/3P4/5N2/PPP1PPPP/RNBQKB1R",
  "rnbqkb1r/pp1ppppp/5n2/2p5/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "rnbqkbnr/1ppppppp/8/p7/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "rn1qkbnr/ppp1pppp/3p4/8/2BP4/5N2/PPP1PPPP/RNBQK2R",
  "rnbqkbnr/pppp1ppp/8/4p3/2BP4/8/PPPP1PPP/RNBQK1NR",
  "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "rnbqkbnr/pppp1ppp/8/4p3/3P4/1P3N2/P1P1PPPP/RNBQKB1R",
  "rnbqkb1r/pppppppp/5n2/8/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "r1bqkbnr/pppp1ppp/2n5/3Pp3/8/2N5/PPP1PPPP/R1BQKBNR",
  "rnbqk2r/pppp1ppp/5n2/4p3/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "rnbqk1nr/pppp1ppp/8/2b1p3/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "rnb1kbnr/pppp1ppp/4q3/4p3/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2NP4/8/PPP1PPPP/R1BQKBNR",
  "rnbqkbnr/ppp2ppp/8/3pp3/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "rn1qkbnr/ppp1pppp/3p4/8/3P4/1BN5/PPP1PPPP/R1BQK1NR",
  "rnbqkbnr/ppp1pppp/8/3p4/2NP4/8/PPP1PPPP/R1BQKBNR",
  "rnbqkbnr/pp1ppppp/2p5/8/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "rnbq1bnr/pp1pkppp/2p5/8/3P4/2N5/PPP1PPPP/R1BQKBNR",
  "r1bqkbnr/ppp1pppp/2n5/8/3Pp3/2N5/PPP1PPPP/R1BQKBNR",
  "rnb1kbnr/ppppqppp/8/3Pp3/8/2N5/PPP1PPPP/R1BQKBNR",
  "rn1qkbnr/ppp1pppp/3p4/3P4/8/2N5/PPP1PPPP/R1BQKBNR",
  "rnbqk2r/pppp1ppp/5n2/3Pp3/8/2N5/PPP1PPPP/R1BQKBNR",
  "rnbqkbnr/pp1p1ppp/2p5/4p3/3P4/2N2N2/PPP1PPPP/R1BQKB1R",
  "r1bqk1nr/pppp1ppp/2n5/3Pp3/8/2N2N2/PPP1PPPP/R1BQKB1R",
  "rnb1kbnr/pppp1ppp/4q3/3Pp3/8/2N2N2/PPP1PPPP/R1BQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/3P4/3B4/2N2N2/PPP1PPPP/R1BQK2R",
  "rnbqkb1r/pppppppp/5n2/8/3P4/2N2N2/PPP1PPPP/R1BQKB1R",
  "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/2N2N2/PPP1PPPP/R1BQKB1R",
  "rnbqkbnr/pppp1ppp/8/4p3/3P4/1PN2N2/P1P1PPPP/R1BQKB1R",
  "rnbqk1nr/pppp1ppp/8/2b1p3/3P4/1PN2N2/P1P1PPPP/R1BQKB1R",
  "rnb1kbnr/ppppqppp/8/4p3/3P4/1PN2N2/P1P1PPPP/R1BQKB1R",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2NP4/1P3N2/P1P1PPPP/R1BQKB1R",
  "rnbqkbnr/ppp2ppp/8/3pp3/3P4/1PN2N2/P1P1PPPP/R1BQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/8/3P4/1PN2N2/P1P1PPPP/R1BQKB1R",
  "rnbqkb1r/pp1ppppp/5n2/2p5/3P4/1PN2N2/P1P1PPPP/R1BQKB1R",
  "rnbqkbnr/1ppppppp/p7/8/3P4/1PN2N2/P1P1PPPP/R1BQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/8/2BP4/1PN2N2/P1P1PPPP/R1BQK2R",
  "rnbqkbnr/pppp1ppp/8/4p3/2BP4/1PN2N2/P1P1PPPP/R1BQK1NR",
  "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/1PN2N2/P1P1PPPP/R1BQKB1R",
  "rnbqkbnr/pppp1ppp/8/4p3/3P4/PPN2N2/2P1PPPP/R1BQKB1R",
  "rnbqk1nr/pppp1ppp/8/2b1p3/3P4/PPN2N2/2P1PPPP/R1BQKB1R",
  "rnb1kbnr/ppppqppp/8/4p3/3P4/PPN2N2/2P1PPPP/R1BQKB1R",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2NP4/PP3N2/2P1PPPP/R1BQKB1R",
  "rnbqkbnr/ppp2ppp/8/3pp3/3P4/PPN2N2/2P1PPPP/R1BQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/8/3P4/PPN2N2/2P1PPPP/R1BQKB1R",
  "rnbqkb1r/pp1ppppp/5n2/2p5/3P4/PPN2N2/2P1PPPP/R1BQKB1R",
  "rnbqkbnr/1ppppppp/p7/8/3P4/PPN2N2/2P1PPPP/R1BQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/8/2BP4/PPN2N2/2P1PPPP/R1BQK2R",
  "rnbqkbnr/pppp1ppp/8/4p3/2BP4/PPN2N2/2P1PPPP/R1BQK1NR",
  "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/PPN2N2/2P1PPPP/R1BQKB1R",
  "rnbqkbnr/pppp1ppp/8/4p3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnbqk1nr/pppp1ppp/8/2b1p3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnb1kbnr/ppppqppp/8/4p3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2NP4/P1N3P1/PPPP1P1P/R1BQKB1R",
  "rnbqkbnr/ppp2ppp/8/3pp3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/8/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnbqkb1r/pp1ppppp/5n2/2p5/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnbqkbnr/1ppppppp/p7/8/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/8/2BP4/P1N2N2/PPPP1PPP/R1BQK2R",
  "rnbqkbnr/pppp1ppp/8/4p3/2BP4/P1N2N2/PPPP1PPP/R1BQK1NR",
  "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnbqkbnr/pppp1ppp/8/4p3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnbqk1nr/pppp1ppp/8/2b1p3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnb1kbnr/ppppqppp/8/4p3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2NP4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnbqkbnr/ppp2ppp/8/3pp3/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rn1qkbnr/ppp1pppp/3p4/8/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnbqkb1r/pp1ppppp/5n2/2p5/3P4/P1N2N2/PPPP1PPP/R1BQKB1R",
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
  "8/8/8/8/8/8/8/8",
  "r6r/pp3ppp/2nqb3/3p1k2/3P1K2/2NQB3/PP3PPP/R6R",
  "r1bqk2r/pp1n1ppp/2p1pn2/8/1b1P4/2N2N2/PPP1PPPP/R1BQKB1R",
  "rn1qkbnr/pp3ppp/2p1p3/3p4/3P4/2N1PN2/PPP2PPP/R1BQKB1R",
  "rnb1kb1r/pppp1ppp/4pn2/8/2B5/3P1N2/PPP1PPPP/RNBQK2R",
  "2kr1b1r/ppp2ppp/2n1pn2/3q4/3P4/2NBPN2/PPP2PPP/R2QKB1R",
  "r1bq1rk1/ppp2ppp/2n1pn2/8/3P4/2NBPN2/PPP1QPPP/R3KB1R",
  "rnbqkbnr/1pp1pppp/p7/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R",
  "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R",
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/1P6/P1PP1PPP/RNBQKBNR",
  "rn1qkbnr/pp1bpppp/8/2p5/4P3/1PN5/PBPP1PPP/R2QKBNR",
  "r2qkbnr/pp1bpppp/2n5/2p5/4P3/1PN1B3/PBPP1PPP/R2QK1NR",
  "rnbqkbnr/pppppppp/8/8/8/2N5/PPP2PPP/R1BQKBNR",
  "r1b1kbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNB1K2R",
  "rnbq1bnr/ppppkppp/8/8/3P4/4PN2/PPP2PPP/RNBQKB1R",
  "1nbqkbnr/rppppppp/8/8/8/4PN2/PPPP1PPP/RNBQKB1R",
  "rnb1kbnr/ppp1pppp/8/3p4/8/4PN2/PPPP1PPP/RNBQKB1R",
  "rnbqkb1r/pppppppp/5n2/8/3P4/4P3/PPP2PPP/RNBQKBNR",
  "rnbqk2r/ppppbppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R",
  "r1bqkbnr/pppp1ppp/8/4p3/8/4P3/PPPP1PPP/RNBQKBNR",
  "rn1qkbnr/pp2pppp/2p5/3p4/4P3/3P1N2/PP3PPP/RNBQKB1R",
  "rnbqkbnr/pp1ppppp/8/2p5/2B5/4PN2/PPPP1PPP/RNBQK2R",
  "rnb1kbnr/pppppppp/8/8/8/3P4/PPP1PPPP/RNBQKBNR",
  "r1bqkbnr/pppppppp/2n5/8/8/3P4/PPP1PPPP/RNBQKBNR",
  "rnbqkbnr/pp1ppppp/8/2p5/3P4/8/PPP1PPPP/RNBQKBNR",
  "rnb1kbnr/pppppppp/8/8/3q4/3P4/PPP1PPPP/RNBQKBNR",
  "rnbqkb1r/pppppppp/5n2/3P4/8/8/PPP1PPPP/RNBQKBNR",
  "rnbq1bnr/ppppkppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR",
  "rn1qkbnr/ppppbppp/8/8/8/3P4/PPP1PPPP/RNBQKBNR",
  "rnb1k1nr/ppppbppp/8/5b2/3P4/5N2/PPP1PPPP/RNBQKB1R",
  "rn2kbnr/ppppbppp/8/5b2/3P4/2N2N2/PPP1PPPP/R1BQKB1R",
  "r1bqkbnr/pp1p1ppp/2n1p3/3P4/8/5N2/PPP1PPPP/RNBQKB1R",
  "rn1qkbnr/pp1p1ppp/2p1p3/3P4/8/5N2/PPP1PPPP/RNBQKB1R",
  "rnbqkbnr/pppp1ppp/8/4p3/3P4/3Q4/PPP1PPPP/RNB1KBNR",
  "rnb1kbnr/ppppqppp/8/8/3P4/3Q4/PPP1PPPP/RNB1KBNR",
  "r1bqkbnr/ppppqppp/2n5/8/3P4/3Q4/PPP1PPPP/RNB1KBNR",
  "rnbqkb1r/ppppqppp/5n2/8/3P4/3Q4/PPP1PPPP/RNB1KBNR",
  "rnbq1bnr/ppppqppp/5k2/8/3P4/3Q4/PPP1PPPP/RNB1KBNR",
  "rnbqkb1r/ppppqppp/5n2/8/3P4/4QN2/PPP2PPP/RNB1KB1R",
  "rnbqk1nr/ppppqppp/5b2/8/3P4/4QN2/PPP2PPP/RNB1KB1R",
  "r1bqk1nr/ppppqppp/2n2b2/8/3P4/4QN2/PPP2PPP/RNB1KB1R",
  "r1bqkbnr/ppppqppp/2n5/8/3P4/4QN2/PPP2PPP/RNB1KB1R",
  "rnbqkbnr/pp2qppp/2pp4/8/3P4/4QN2/PPP2PPP/RNB1KB1R",
  "rnbqkbnr/ppppq1pp/6p1/3p4/3P4/4QN2/PPP2PPP/RNB1KB1R",
  "1nbqkbnr/rpppqppp/8/3p4/3P4/4QN2/PPP2PPP/RNB1KB1R",
  "rnbqk2r/ppppqppp/5n2/8/3P4/4QN2/PPP2PPP/RNB1KB1R",
  "rnbqkb1r/ppppqppp/5n2/8/3P4/4Q3/PPP1NPPP/RNB1KB1R",
  "rnbqkb1r/ppppq1pp/5np1/3P4/8/4Q3/PPP1NPPP/RNB1KB1R",
  "rnbqk2r/ppppq1pp/5np1/3P4/8/4Q3/PPP1NPPP/RNB1KB1R",
  "rnbq1rk1/ppppq1pp/5np1/3P4/8/4Q3/PPP1NPPP/RNB1KB1R",
  "rnbq1rk1/pp1pq1pp/2p2np1/3P4/8/4Q3/PPP1NPPP/RNB1KB1R",
  "r1bq1rk1/ppnpq1pp/2p2np1/3P4/8/4Q3/PPP1NPPP/RNB1KB1R",
  "rn1q1rk1/ppbpq1pp/2p2np1/3P4/8/4Q3/PPP1NPPP/RNB1KB1R",
  "rnb2rk1/ppp1q1pp/2p2np1/3P4/8/4Q3/PPP1NPPP/RNB1KB1R",
  "rnb2rk1/pp2q1pp/2p2np1/3p4/8/4Q3/PPP1NPPP/RNB1KB1R",
  "rnb2rk1/pp2q1pp/2p3p1/3p1n2/8/4Q3/PPP1NPPP/RNB1KB1R",
  "rnb2rk1/pp3qpp/2p3p1/3p1n2/8/4QN2/PPP2PPP/RNB1KB1R",
  "r1b2rk1/pp3qpp/n1p3p1/3p1n2/8/4QN2/PPP2PPP/RNB1KB1R",
  "r1b2rk1/pp3qpp/n1p3p1/3p1n2/1B6/4QN2/PPP2PPP/RN2KB1R",
  "r3brk1/pp3qpp/n1p3p1/3p1n2/1B6/4QN2/PPP2PPP/RN2KB1R",
  "r3brk1/pp3qpp/n1p3p1/3p1n2/1B2P3/5N2/PPP2PPP/RN2KB1R",
  "r3brk1/pp3qpp/n1p3p1/3p1n2/1B2P3/3N1N2/PPP2PPP/R3KB1R",
  "r3brk1/pp3qpp/n1p3p1/3p1n2/1B2P3/2PN1N2/PP3PPP/R3KB1R",
  "r3brk1/pp3qpp/n1p3p1/3p1n2/1B2P3/2PN1N2/PP2QPPP/R3KB1R",
  "r3brk1/pp3qpp/n1p3p1/3p1n2/1B1QP3/2P2N2/PP3PPP/R3KB1R",
  "r3brk1/pp3qpp/n1p3p1/3p1n2/1B1QP3/2P2N2/PP3PPP/2KR1B1R",
  "2r2rk1/pp3qpp/n1p3p1/3p1n2/1B1QP3/2P2N2/PP3PPP/2KR1B1R",
  "2r2rk1/pp2bqpp/n1p3p1/3p1n2/1B1QP3/2P2N2/PP3PPP/2KR1B1R",
  "2r2rk1/pp2bqpp/n1p3p1/3p1n2/1B1QP3/2P2N2/PP3PPP/R1KR1B1R",
  "2r2rk1/pp2bqpp/n1p3p1/3p1n2/1B1QP3/2P2N2/P4PPP/RPKR1B1R",
  "2r2rk1/pp2bqpp/n1p3p1/3p1n2/1B1QP3/2P2N2/P4PPP/RPK2B1R",
  "2r2rk1/pp2bqpp/2p3p1/3p1n2/1B1QP3/n1P2N2/P4PPP/RPK2B1R",
  "2r2rk1/pp2bqpp/2p3p1/3p1n2/1B1QP3/n1P2N2/P3BPPP/RPK3KR",
  "2r2rk1/pp2bqpp/2p3p1/3p1n2/1B1QP3/2P2N2/P3BPPP/RPK3k1",
  "8/pp2bqpp/2p3p1/3p1n2/1B1QP3/2P2N2/P3BPPP/RPK3k1",
  "8/pp2bqpp/2p3p1/3p1n2/1B1QP3/2P2N2/P3BPPP/1PK3k1",
  "8/pp2bqpp/2p3p1/3p4/1B1QP1n1/2P2N2/P3BPPP/1PK3k1",
  "8/pp2b1pp/2p3qp/3p4/1B1QP1n1/2P2N2/P3BPPP/1PK3k1",
  "8/pp2b1pp/2p3qp/3p4/1B1QP1n1/2P2N2/P3BPPP/1PK2k2",
  "8/pp2b1pp/2p3qp/3p4/1B1QP1n1/2P2N2/P3BPPP/1P2Kk2",
  "8/pp2b1pp/2p3qp/3p4/1B1QP1n1/2P2N2/P3BPPP/1P2K2k",
  "8/pp2b1pp/2p3qp/3p4/1B1Q2n1/2P2N2/P3BPPP/1P2K2k",
  "8/pp2b1pp/2p3qp/3p4/1B1Q2n1/2P2N2/P3BPPP/1P2K1k1",
  "8/pp2b1pp/2p3qp/3p4/1B1Q2n1/2P2N2/P3BPPP/1P3Kk1",
  "8/pp2b1pp/2p3qp/3p4/1B1Q2n1/2P2N2/P3BPPP/1P3K1k",
  "rKrppBK1/12q11Kk/2K2PpN/QQBP4/Qn21NP1/rqnQp3/k1QbbpN1/11qPk3",
  "nnn5/B1pnKr2/221R1k/1pr5/qqrNKR2/RKN1Rqk1/11K121n/1RBKNqB1",
  "RpBq22/PqBKPp2/KQBn31/qPpPKkn1/rRpNQ3/p1nKBB2/BKRqk3/qnqNPn2",
  "qPNBq3/13q1p1/1pb2BKq/nKNkbR2/1ppk3r/Qpk2Pk1/B3pKN1/PrKq3K",
  "1nPpQpkb/bQNKknr1/Bkrn1BR1/KQkkr3/QR2nR2/Qn2Rr2/b3Q1N1/NnqbrpNN",
  "QRrn4/KrRqr3/p43/bKB111B1/NNRPQkb1/pBR1nKr1/n31pK1/p1Qbpq2",
  "pn2k1p1/rrk1NP2/11kPP2q/N3k2n/Br1nRK2/Kqkqqq2/1P1BrR11/pPppP3",
  "1Kk2q2/nKpq22/nR31q1/bQQP31/qQNB2N1/1K3nb1/Pqp2Rr1/1KpN3P",
  "bnkB4/qQb1B11k/QB1rP3/bkR311/kqbkqkb1/p111q3/n1n2qq1/13nrK1",
  "rpN2Nnn/K1KN1pQ1/BNRnp3/1b1PRnN1/R1q21P1/112qRB1/rpbbpn2/qPkP2Rb",
  "qkRK2n1/qp1Prp1q/BqKQpr2/rNNrkrq1/kqN4R/3kr1PB/NNB4Q/r11b1k2",
  "kN3rP1/1q11rQ2/11nkkQnr/rNRqk2k/kq1krnpr/qK1n1B1P/N1Pkkb2/Q3r21",
  "b1B2Kb1/PRkQb21/1qn2Bq1/NK1Rb1nk/KppRK2B/pBq2rB1/pnqn4/Nk1br11q",
  "bnBNN3/kKnpPQ2/Qk1N1Q11/1n1nNQ2/1pK1pPB1/rrQ2bpP/BnnKKNk1/kprK4",
  "1KkNb3/12kNK2/kKqP3R/qQ3Bp1/r1kBKR2/PQ21Qqq/NbNqKqk1/3NrR2",
  "2BqNn2/bBKr3R/Rr2R21/Q2K2rK/nP3q1k/KQNkQk2/Nrb1Q12/PP3RN1",
  "K1Pbkb2/npRpr3/PP11RrnQ/NPp3n1/kr1R2B1/NpkkQ21/k1KB1nBr/kNrkKP2",
  "NB1KNKb1/bRqQ4/RQ3111/B12RqQ1/1211b2/rbR1rN2/r1KqbKk1/nRqNR3",
  "bBKQn3/bbr2N2/bRqBbq2/RNp5/KBbk4/R2nBbQ1/1Pp2bB1/rbnBN3",
  "pkP2Q2/BrNkQR2/2KNBPp1/1BKpNN2/2n1NBP1/1B3bPb/kbpQKpB1/pBQb31",
  "Bnr1pK2/BQkK1RrR/N3QPk1/Q2QkKPN/22kkK1/N1nnPQ2/RRKQrpB1/NRppRQQn",
  "1KqRPb2/PpQpBr2/BbBnK3/kR1p2QQ/rppr21B/kkN5/Q1pbNkK1/b1Pk31",
  "kppNP3/p11rbr2/prbrbP2/bnnpP3/nnNbRr2/Nrr1pB2/2qr1Bb1/1r11NP2",
  "kBRkqBkB/NQ33/rkqBpNKp/nqB5/Pk312/QNrPRNqp/rK3RK1/1r22kP",
  "PnqQp3/rN1Prb2/QNKQkbQ1/bkpB1pqn/BrBKrB2/1qr1Pn2/2pb11pP/1rN2rNq",
  "N1R2BqQ/PnNb1kq1/qpRNb3/12b1nnQ/RPqkQKB1/qqN2kqQ/Kb2kqqr/1qpnn3",
  "bkbK4/bKkN211/NP2bbb1/krNN31/NK21Bq1/PKPRR3/RNKpBbr1/pn3pB1",
  "RbB1rbn1/kBRBpn2/QNR4N/BQ1PrBbN/rbQ1kQB1/Nbq2qQK/kQQkbpN1/nnbqpR2",
  "pNK1pq2/RP12nqn/R1nBNb2/1kRkq3/12BbnB1/rrbR2R1/N1kQqb2/KknprR11",
  "RbrK2B1/2qnKKPp/kpbQPkKK/1knp4/nPn1b3/BkNkK3/prrPKp2/b1Bqqpb1",
  "KKkN1PNQ/k1kpp12/rbQ5/NKrqQk2/qQPqR3/1p51/rR21B2/qQQ1QrBq",
  "NNkRr3/11RBKqq1/KKBQn3/RBK1PK2/1kN221/1Q1rB3/3qR3/pnqkr3",
  "QNRqPRR1/kQkKBR2/2np1N1p/K4111/KnRQqb2/kNqBNr2/1K11Nrk1/1qPr2N1",
  "prQbrB2/NrnRB3/QbppQ3/kQKbBK2/RRNnQ3/b23B1/nQpK3b/r1rR3N",
  "R1n3P1/RkNNPR2/1KN5/QKnPqpR1/PbkR3N/111nnKn1/pBQ1p1rN/NQQNnKK1",
  "rN11kr2/B1qNkn2/kkBrnKr1/qqKqBk2/PRnNKp2/1brBK3/QNbkrR2/Qp1qNn2",
  "KQBRb3/KRq5/pkBRQRq1/1PNq1q11/Rk1qnq1N/2Kb1rR1/PpRrKP2/11kkRp2",
  "1Nb1Q3/RrnKqN2/1b1KKk2/qNPrppr1/1prPQq2/Nqb1R3/q4QbN/KPRbPq2",
  "rbn3qB/QQkPKBnP/111bbNb1/pRQ1bQN1/qQKpQ3/rqKkQP2/BBk21k1/2rqrNp1",
  "RRBN4/Q1KnNn2/qnQpRk2/RN2K3/KBN1nnpk/1PNkqK2/1QqkRkn1/r21R111",
  "kB3QRq/B1nQrPN1/pq33/bQb31P/K12pk2/NBQ2q1B/N2KP2R/PKNBpb2",
  "qQKkNn2/rKQB31/QRP32/nQ1pNRq1/1bRQqPb1/Kqkr2N1/PbbBKq2/1qNr4",
  "BPqkpP2/r1BpNqNq/kpRBbR2/QNkrP3/rPBN2nq/2qkb3/qqbK4/kbPqkk2",
  "1pB5/rn1pQBr1/BQP5/11RNppP1/QBPQR3/2Q1n2b/bB11pBP1/qKBKN3",
  "1QBPpBRK/1rn2qb1/1nQK4/Q1NPKR2/BR1rk11P/k3K1kn/QQNb1bn1/bKknR2B",
  "1nkP4/K1NKN3/KkB4N/121b3/bp1bNrrk/1PKr4/p11N21b/b1N2NRn",
  "kNrKrnR1/pnqbbnBK/1qpn3P/r1BRN3/pnbpRqpQ/P1Pbpq2/3qK3/RB2qNb1",
  "n11rrrQ1/bPpnB2R/2kRRn2/3k31/pNQQ211/RqKp4/1NBPrBBq/RQPNk3",
  "QrbNN3/1NQqrr2/BbknKBP1/1qNnBb2/r1bQb2n/N3B3/KRNpnBb1/RB1Rpr2",
  "1pBpq2Q/bQ2RK1N/b2qrN2/Pr3bRb/nkqq2K1/PBrqrN2/nqkbR3/Qnn1rRb1",
  "nqPrQ3/nP1PBP2/1KPkNQ2/QRKQ4/Qkb13R/Pkprb21/R2nqN2/1nRN4",
  "nN1nrnp1/13r1n1/nb2QNk1/nkBpbBP1/ppbRkBb1/rkp1PK2/nN1kpBnQ/QnRb4",
  "BQNpQp2/QKbNqq2/KqrRQrK1/PRKN2p1/bnRnb3/r11K111p/q6N/pK1P2NB",
  "qbp1K11Q/21kKQp1/1rRN31/nrbR1q1n/1PpkNN2/rNQbpQPK/pN6/RP1BqQP1",
  "3Rnp2/QKKNKNnP/1R1n11PB/bQR3q1/q2qb2R/RPRRr21/bKrrNPb1/11112n1",
  "1b11RNKb/Q1rQ1nn1/QpNQNN2/bkPBrN2/BbkRnKB1/Nb1RKNB1/111r1qBR/Nb1krQ2",
  "QRNQRpP1/R1nrrnN1/112N21/bKb2PN1/BNbK4/11qp1bBR/q2nqKbq/n1qn2n1",
  "QQ3rrK/1PKKnRp1/BnnQrP2/1RK1rR2/QnNqqB2/QqB1kQ2/1PbBP3/b1rBr3",
  "qr1KbNn1/1NkQprB1/1QbNk3/PNk1P11B/1nr2r2/rQkkKN2/1RbnNp2/krPk4",
  "1k2PbqP/rPbRb3/RRN1kBNk/Q3N2b/KPnPB1rP/BbrkN3/bKnBbp2/NnR1B3",
  "QR2q1NQ/Rnn1b12/K2rN3/N1RKN2K/RkqPnB2/QnRkpKp1/QnK1qKQK/q121B11",
  "q1QKbPr1/qbqB1BnR/rbR31Q/BPBBn3/qKbKPk1q/np1pN1kb/nbrQ4/P1q11n2",
  "qNrPr3/BqQK4/B52/kb21KKK/1q3q1n/bpQrrqQ1/1b1kBKQ1/2PPNK2",
  "r12QK2/Q2b11Nr/NPKnPkq1/1QRn2Bn/KKrkPq2/bKPPP3/11bp2rq/r2QkR2",
  "rqqNK3/2KrKbK1/pbPp4/rBKnnk2/rkp3R1/pnKnNP2/bQ2k111/QB1kQ21",
  "kNRRrBPp/rBbQP3/RrkQkQKQ/BNrkBn2/pnqRrP2/QKk3PN/1n21Q2/KbkN2Bk",
  "pQn3p1/B1BRNQ2/Rnq3K1/r1RrQqn1/qnr41/qPQQQN2/PKqrKR2/1PKnr3",
  "q1pp2K1/bNBRr3/1nKrrK2/NBbRQRr1/kNNbrQQ1/rkkKp1k1/bNKPnNqp/1nBBq3",
  "1KRQbk2/kR1nnrR1/KpRq22/qBNKK1BP/bb2NnQ1/BPQb4/1B1pkpkb/r1nPkQ2",
  "rqKbP3/Qk1Q1rQr/bK1bNbp1/1nPRbQBQ/kBPqR3/b111QQNQ/nKRPq3/RkB1Npr1",
  "nPnB1qPk/N122Q1/bPQp4/1PkQBB2/r1QnKQ2/Qq22NQ/1n1B11kQ/bNkKnN2",
  "PNB2nb1/qnBB31/r3KB2/qPqkRk2/NQNPRr2/21KPp2/qbqqp1R1/pN3PkR",
  "BRNpb3/Bp4B1/2nKN1K1/nP21N11/1bnBbqN1/nPKrP3/nB2k3/PKkKK12",
  "BnKkqn2/QNpN2b1/1QrrBq2/BpKrN21/kr2QPpn/kR2kN2/PpBrNp11/QbNpkPR1",
  "qqqqK3/ppQQQK2/PnKNP3/N5n1/ppK1RQ11/12P112/1nn1NR2/2bnrKQ1",
  "2bk2Pp/pNRBP3/nbr21K1/RNpNq3/PbqKN3/Q2qRBp1/QNPPp1QK/2n1q1b1",
  "QPbR1pn1/qrQpkpQ1/PPPBN3/RrnK4/Qb21K2/P1PRRRP1/kK4kn/NnKp4",
  "br4KR/n2P4/rkbN2bk/QPRQ4/NBk1Qkr1/R11r1b2/bR4R1/2RKr3",
  "2PpB1Kb/kKRPN3/1RPrPQ11/q1kR4/11NnKK2/11QrQB2/bb3Rqb/Kr3nR1",
  "kpkr1PP1/NK2kKnR/q2n1kqK/KR3qK1/Q2KRKK1/1NpBq1n1/rr21qP1/Qr2kPR1",
  "rbQR31/npqK3N/KpnN3K/11Bkq1P1/KRPNbb2/Q1Rr21N/kRpN3B/1P11k3",
  "q1K2kp1/Bn3nk1/qQN3nb/n2nKrr1/knQBQ3/bbKb4/1B222/KR2brN1",
  "b1PB2PQ/NRRb4/1B1NNNkk/1KQNq3/2BbQP2/1RB32/KPNB4/22pqr1",
  "Bb212P/nb2b3/2nrRBbR/QQ1k21k/1KQp31/kbKPb3/RknPP3/1Nkkkk2",
  "kQ1Nk3/KnKn4/1nP11nK1/3QPPBk/1krB4/n1n1knq1/r1qQBBkB/K1PKknkN",
  "1NnRqQ2/KnQPPBn1/bq2Kr2/NBkQNPP1/1rqrrnB1/nR2Qkk1/bNnr21n/PRN2kNr",
  "Rn1p1rn1/n1KKB3/qnB21kr/1qrpbR2/QrRP2r1/bk1RNR2/rPpk3P/q1Bp4",
  "BKNRq1pk/Ppppkq2/BkbnkrP1/bkq21rb/RPnPp3/pP1r1BkR/1N5k/KbnQqnQ1",
  "11r2bK1/bPP11BR1/kKBbnb2/krqPQp2/knPQk2K/kQQQbn2/1nkn31/2BPQBp1",
  "1p1Kq21/BRNPQp2/1RKqBn2/N1Pnq3/qKp21P1/nrPbn3/NBbBq21/pRRNRPq1",
  "1nrnBR2/nNBBK3/QKQrPPPb/2Qb4/BQQbqn2/bK1k31/NrPqRq2/ppqqBR2",
  "1k1KP111/K1RNKqR1/knNpNQ2/QpqqN3/KRpppk2/kN31N1/RNPN4/BKPqN3",
  "1NN1r2q/q1rP2K1/Rb3kRb/Qkpn31/K2bPbN1/qpp3bR/rrB41/bNKPQbr1",
  "b1kPkkQ1/PQ2NNNB/1K1N1KQ1/nB2PNrn/nR1Kb3/krB5/BRK21NR/1RQp1NR1",
  "1kK1rpN1/Rq3B11/n1Nrp3/Rb1KrRnK/R1Bq2N1/nKr1q3/k1pNkq2/r1kbB3",
  "RkRprn2/Krb41/pPNN3K/R2n3R/NqNB4/p1kRr11p/bPkBkP2/R1PPpN2",
  "111Q2R1/k211Bp1/rkpk4/1N1qbb2/QBQBrq2/kqrBPP2/2rNR1RN/pKnpkr2",
  "nkKb4/bPrNr3/krk2nQn/PBbrkR2/PqR111qq/pk2QNk1/1K1b11Nn/nbR1n12",
  "11kqrbpN/BbqqNkR1/N1RNkRkn/B2qP2q/nb1kqb2/11K1r12/bP211b1/Kbnbp3",
  "nN2n1qQ/R2pQ2Q/K2b11q1/N11K1pb1/2Pr2R1/qNKbKQ2/Q3PPNp/11n4k",
  "22kNnn/3RqbN1/pp1BrNr1/n21Qr2/1n1PPkr1/RRK1KK2/Q2QRB2/1Kr12q1",
  "11QQ3n/1N1kq3/pNp11B11/pQRKnqk1/rR3rkR/b1Rq2N1/Pq211p1/PN6",
  "p1P5/nR2pP2/rBQrrRn1/kpqpKK2/11Kqkq2/n1Nrpp2/PnRbKK2/rBK41",
  "K1qnqkk1/pQkBKn2/Kkrkqn2/P1nN4/b2bn21/NkNbq3/31qQqP/N1Nbn3",
  "pP1kn11k/kRQRrp2/nqbrB3/NpP21r1/1rQnk1rQ/rRKK4/pnK2B2/Pppkp21",
  "11qKR12/k112kn1/KkB5/kkQR3N/1K2211/1KNqn21/KbQBQ1QK/PQrNQB2",
  "BbN3b1/BBknR3/BNQQn3/bQRpb3/nkqkKN11/2KkKR2/RRrKNP2/2pRB111",
  "KkrkBbb1/kn2PP2/11KNr3/NbrBkbnk/RNR1rbr1/NQn2KB1/Kkrbpq2/rppn4",
  "bp23r/K3pR1r/rBq11PR1/1nbQQP2/k4Bnp/n2NpK2/1BnK2bp/1N1NKN2",
  "N1NPKP2/NQnnbNn1/nbkn2NN/RPnKr3/PB4rQ/1rQ1BN2/P11kkk1b/rbP4P",
  "Krp11Rk1/RBPp4/RKkKrb2/KNPkbB2/qnr1Rpk1/r1Bn4/r1Q1n1Nb/1bbnqp2",
  "B2qqRq1/bBKpPkk1/1Nbn22/bk1k1rnq/q1B2pq1/B4q1P/NQ1PKpK1/Q1nKp3",
  "kb41B/1kN32/bqBb211/rBRp4/11r1BQnP/brp4b/1NPnR3/1BBRq2r",
  "kprBRbB1/QnbkrkN1/qQQQ4/r1qK1bN1/3N1r11/k11brKp1/11nrnQ2/1pP1Qpq1",
  "11bPpkn1/k1pkrPR1/BKbrr111/bNqPrpr1/1nr212/1BkQB2Q/BP3k1K/pPkK1N11",
  "kbKqr3/11BBBQ2/1nbnb21/1bPNKqq1/Nr6/QkbPbr2/kbP1n2r/PBpp2Nb",
  "NrBB2N1/Bn3pbq/BnpP31/p1R1121/1BbKpBRk/1B3BN1/n1BpPN2/KQ1p11Np",
  "b2KP2q/Bk2qkK1/NBnrR3/P1Nqqqb1/1knq1bB1/pbp4P/qN11pn11/rQPkqrB1",
  "k1pr31/NQ3b2/K4kKQ/nqKNRn2/qNKnPb2/q2PB3/R1rB11R1/p1nR31",
  "BR1K1bP1/QPKP4/BBRN2Kq/3bkpr1/b2nK21/11qnN21/1Rpq4/1n1pkPB1",
  "Pknb4/Nk1Bnr2/kkB1K2K/PKbRKqK1/1KR41/11Np2rq/brq5/KRR1KB1p",
  "Q1qqRqk1/1pB1P1Np/Qk2PBr1/1q11KbNk/N311Pq/bNpRNR11/RQkqkn2/KPkNnp2",
  "1PQRKKrP/kP3pQP/N11rR3/PKnQK12/1KPbb3/RBQk4/r1kk1k1r/q1k1KRk1",
  "k21rBp1/1Q11121/1B1BPPRq/RBkr1Bb1/NNnkKpKk/BBqbbP11/R1PKqk2/qb2kb1Q",
  "qqQqqPQ1/pRqrKq2/b1Rn11b1/KKK2R1K/1nr1PRBq/QpbNNRQ1/1BRQBN2/p2B1QqP",
  "PQR1nnN1/PPrkq3/1rRbrrq1/KPqQknNP/211qqbN/1bqbr3/r142/B11q13",
  "11pPBr2/1KqbnK2/Kk2BrK1/N1QpQKp1/nBrRKR2/2kpb3/rRn2P2/QKnNb3",
  "1PRnrb2/rbBPn3/13q3/NRRrBKqk/KQ5k/p1BR1P1k/pRQr3K/bb1kr2K",
  "Pbq23/NrbpN21/BP1Pnkr1/rk3Ppr/Q12rq2/pRkR1bKP/1Q1RRnr1/ppqbNq2",
  "1k22q1/24r1/1PkN4/R3pKbq/1rbNpqB1/kNPbRr2/KbKppN2/kRQkQP2",
  "pQQk12k/qnn1Pn2/qrRb4/qBbPB3/Kp2NQQK/QKpRRRQ1/nR3k2/n13p11",
  "KB1KrN2/1brpq1rn/KkpBK3/KRNqqbK1/KknbR3/11Q31n/QBQR1pnb/R1k2qB1",
  "RpP3r1/Kqq3B1/RkBprb2/pBPqnq2/bPNBk3/3qRRr1/R1QPPP2/rpQRr3",
  "b2BPn11/1111r111/NKnp4/1Nqr211/NQPRnP2/PQkb11kP/BQkQB3/rBN11RQ1",
  "PR2P2n/1BqrqPNN/pK4K1/111Rk11P/RKBbrB2/QN11KRKP/21Pp21/BQqR3r",
  "bknNNn2/Bp1NNPp1/K1RPpnPK/N2BnqR1/rQ2QrkP/Kq1Npqr1/QKKqKb2/pQkBQpR1",
  "2PK13/BqRpqKn1/rqp3r1/rK4PQ/1k13R1/2rQpn1B/R11BpK2/krPKQp2",
  "1PpQRB2/nQqqkR2/nkRk2k1/p2K1rNP/pNp1KQbN/11kQKNBq/bqPQpB2/rPBB4",
  "11n2br1/QBK1kR2/13pKKb/Np2rb2/1Q2rp1P/bQKBBkP1/QqRnRqKq/1pprRN2",
  "n1R212/kqqKq3/PrkpBR2/BnpB4/3RKR1P/kP11Bkk1/Q3Kqp1/rNnkk3",
  "1b1qnpR1/np2BN11/1KQPNb2/RrB3Kq/NRBr1B2/1Q1BK1Pp/rNrpkr2/kRBn2Rq",
  "2nB211/RKKBbB11/Nr32p/n1PnQ1Bq/QbpRR3/qnNKQ3/QkNKN3/11qBb2p",
  "rKKrrBp1/bQnrkNR1/pBKP4/NpQ5/k3kK2/nR2NnRb/11B2qQ1/KkK5",
  "KkRBqP2/PBrB1bQb/np1rKR2/nN31r1/bnbQ4/PRb2nbB/KBbNp3/1pR2K2",
  "B1Pp3n/1rBk2Q1/1k11r2k/P1p2QBP/NqQnqrNk/Kr21QN1/qKQNN2n/qBrkpnN1",
  "PbBbR21/RRP2rk1/PN1B1Rp1/1BPRqNr1/13QRk1/rpNb4/rR1Q11K1/NNnRKKN1",
  "K1R1Q3/1PK1prb1/QpnrR21/N3211/BRRKN2r/pRpK4/KNR1br1p/pKBRp3",
  "krbKn3/Q1rkB2B/112QbP1/nr1bqBn1/qBqbqB2/KbRbQrQ1/qnKBnn1k/Q1np11nQ",
  "21rQ2B/P4Prq/kqq2k2/bRnkrqq1/1nPbbnP1/qrKNPQ2/BQQ22B/q11pb3",
  "K3p3/Qp411/p1kK2QQ/NKQR2rR/Bq11BNqK/1N22P1/BbpR1qb1/kpnpqQ2",
  "pRrrQRK1/q2QNKP1/qrPNBRPB/1pKrrBKn/KN2PN2/NK1Pp1Rq/3Kkb1q/1kQKpr2",
  "BBkq4/kPPQKBR1/Rq2qqP1/N1bQq3/n1bNbQ2/kKQ4R/p2rrBN1/qr1QP3",
  "qrKPNr2/QqB5/nRKNnb2/BnkN4/pn1rKB2/1kRnQ21/1k311N/k21nP1b",
  "3p1p2/Nq3KQr/R1pQP3/1RQBBQ2/nP1pbq2/rN4kb/nNpbk3/QbNrnBn1",
  "r2pqk2/2kqPB2/1Nnrkk1p/1qnKRNNb/2B1r3/k2NNPp1/BrBr3b/nRpKQNP1",
  "1QbBnb2/B2bNr11/RRrNk3/q11PpnK1/PpQRbKn1/rprNN3/PkQ3RQ/kQ2RP1b",
  "BR4rN/1pBBKNP1/1b1qQ3/Nb2kkKP/PKk1kN2/P2k11Nq/qQB1b1B1/nRNQ2BQ",
  "pBbKB3/kb2kBq1/nPRbR3/RNRq31/RRk32/pPB2pnn/kKq1rKp1/pbKR31",
  "PB1N1qk1/1rNqQp2/kn1nkpbq/kbK13q/BRQ1bp2/NPBqR3/RKqQkq2/R4P2",
  "RKQqkkK1/QbKpnqP1/NQp2B11/rR1NKKr1/1rKrqBKB/b1RQp2p/111qKr2/KKp2R1P",
  "213nK/rqB11Bbp/b11kpN2/NQB5/bbPBNK2/PrkQqRP1/1k1NkqR1/N1Bqb1pB",
  "N1RQp1P1/B22bb1/1NPPnB2/21pkq2/nNQnRB2/N43/rnR113/Q1nr1nKQ",
  "rPrnK1k1/PrR4n/bbBNkQb1/PK4pk/nR21QN1/pPpKrPNN/P2NrbNp/1R2KR2",
  "Q12k1qN/Qk2ppPr/rn1nRb2/RkbKrR2/bK141/RNQbpBQ1/rNBk11Np/qQRbb3",
  "1pn2p2/nKnNrQ2/1kBbRr2/kP33/QQn2Rrr/2n3rp/1bQbPqqN/pnKn4",
  "RRrn4/pnBbP3/P1QQrpK1/1RpqQnk1/nnB1p2k/QKRn4/1NQbrNpQ/N2QPQ2",
  "kRrq1Pp1/NN1NnKR1/BPkk4/1NPqBrr1/1KBpnBP1/2K1k1n1/QQ1bqQr1/1QpQRN2",
  "1p2Qn2/knQ11pR1/qPKnnN2/pbB1BrN1/rnrkQqQ1/bQRqb3/rN1brn1N/KBKq2kN",
  "11PN31/rNKq4/1K1kB11b/nqppprq1/RKq4Q/BpNR2qB/rKQpN1rq/BN1NR21",
  "Bprk4/BPN31Q/Rpp2QP1/kqKqpq2/RQ2rk2/Kp2r3/KnNkbK2/11bKrp1k",
  "1Bnq1P2/q1k1PNn1/QQbpb3/pnr311/R5NP/rPBb4/11knk21/1p1NK3",
  "Nqrb4/nB21Rn1/PbrqqR2/1RQNRN2/3nrpb1/BqRNRb2/bNPnQ3/kBB212",
  "1n3Q2/kn2rNpb/B2b1r11/PqNbB3/bpr1kq11/nbnpP3/2q3Bq/r21211",
  "kbrrKR2/N21r111/KR4rb/nkkpr3/QQprK3/rr2Q3/nnn2rP1/b3P1k1",
  "1qQQ4/rK12bb1/R2NNr2/PRN2rN1/P1Pk4/1RR11RQ1/1R2QNnQ/npNRk3",
  "bqBpQ3/QnqRn3/kBbNrb2/br311K/R2KNk11/1nrqk3/Qrk5/RKPQNQq1",
  "bN1p1N2/rNq3BN/1bBbb3/NRn3kn/RKqn4/21Bqq11/NBNKpKkn/k21p1NQ",
  "1qbqnPp1/KNpr4/2pBbK2/n3kN2/RRPnr2p/1pkNp1Rr/Q4pP1/RRprRqp1",
  "RK23B/KR12NQ1/BbkkK21/pNNkQBq1/kBbNn3/nRq2B1b/qrn1p21/QbKq4",
  "1RrbrNNb/bP3Q1Q/1rbrp3/prqKRq1b/qKknqQ2/bPq3R1/Bn4k1/rk312",
  "QKrBR3/BRP1PRP1/rrQpqrPn/Q1Q2NrP/r2KbN2/RnBkQ3/N2qNq2/Rbpqrb1p",
  "pk2RK11/11K1n11B/bnnnK3/bnKp2pq/pK2Qk2/1RBRQ3/RnQnpr2/kRkn2q1",
  "kbb2R11/qK2qK2/11111b11/1q1bpp2/14111/q1RKK2N/1KkPKRq1/kRP31n",
  "11BpNK2/1pNR3N/Pnk21RK/b11bBNBB/ppRnQ3/bqBbKN2/QNPbnp2/1p1K2q1",
  "PP2nbQ1/rN2BR11/1PkqB3/1PQ1kr2/PQn4k/qq3npQ/bkn2b2/1NR2B2",
  "k22Qk1/pn1qPB2/BKnRq1kn/rr2B11K/QkKnnPB1/1PqQPkN1/bRpq2nq/KQB3pk",
  "Rr4b1/rb311B/2qPKbR1/NKpkkppP/PPpnnrb1/1rn2k2/kpP2Nr1/bQ2RNN1",
  "qpq5/kb1pkbr1/11rqPq2/KppnBp2/kn3qkB/kRR32/qr3P2/b1bBnP2",
  "QkQkn3/p2NQQnN/QBrqrK2/Brrb4/1K1R1qkr/KnQqb3/Q1BK2Pn/r1nr21K",
  "Rnrb3q/n111b1Qp/kQb21QN/pNPrbnnN/1QpRKNN1/qRn32/qbn2Kn1/NR2K1n1",
  "RkRQbRPR/pkBrNr2/KpqQk3/Np311p/P1bRQPN1/brBnqb2/PP1kNb2/2n21Q1",
  "BPbkrq11/RqKK4/RqrB3n/NnknpBP1/kpk23/QPnPQn2/KKkP11b1/nrQ1BnRn",
  "qK2nNp1/nR2npQ1/Kbq2pB1/KKQ4N/R2K31/NBqp4/kpQ32/1nrNq3",
  "bnnKn3/PnrnN3/1qR1kkb1/bk1Nbk2/1Pp1BB2/1qnn4/1p1KNNQr/Kr6",
  "QrrpR3/nQnkpk2/qbnnpK2/bNK2qQ1/bqKk3k/pPn3bN/RkNrRPp1/112KrNp",
  "BR11bbkN/pbbrkB1q/PP1Pnp2/r2KQBB1/prKNnkR1/1n31Qn/2K32/nKRRrQ2",
  "PBp1111p/K1QrB3/1RQ2KP1/RBB3q1/1PBPRqp1/2pQBrnk/qqpkr3/bnK2Qp1",
  "n1qPb3/R1BqN3/NR1Nk2K/qBNr211/1krk31/Kk33/rqpnnKq1/KP2pq2",
  "p2pr1PP/qknRrbpb/qR2bNn1/1kBpqR2/KnQqBQ2/bQRP3K/bb11PBB1/K1QK3P",
  "BBkKnBQ1/kQk2b2/r2RRk2/2n1r3/nr4q1/RRBB2Q1/rpnKP3/2Rnkb2",
  "NqPn2k1/1q1NNNP1/1nNRR3/Npp2Qpp/2BPK3/Pkkq3n/NPNBkb2/11Qqq1pq",
  "rqkqkP2/KKNrP3/k11Prq2/RN6/1bq1KpQ1/nqqN2nn/brRpP11p/1Bk1NpKQ",
  "R2RqrR1/nBnR4/RRQR12k/NbN1Rn2/KKQbn3/bknqRPP1/Qr1KBK2/BpK1RkbB",
  "kbP3bk/NPB2q2/Rp5r/1BP2p2/PkrKK3/qq3pb1/QKqNqppB/nbqPKQB1",
  "QKPQp3/2n1pRpN/rRb31r/RPKpnK2/RqNk1111/kQkKBQkk/11NBkRB1/KK1RkQn1",
  "kb11KKNQ/1pRp3k/pkQk11bq/BnQ1qQnr/nR2P111/KBbbp111/pKpB4/1QqnNb2",
  "p1k1KrN1/KR42/2n1BqPK/kNPN4/1Rr2qP1/krqN31/pkRK1Q11/KNb5",
  "qbP1qKBQ/Q1PbPRkK/1Qnk1pK1/rpp1r1p1/brpR3n/1KrBR3/kPPq1NkQ/rrNPK3",
  "pN1q4/4nRQk/nN4r1/r3rNp1/1r2kpqb/bkkqrr2/qpbPbPk1/BBrNq3",
  "1qnQr3/2PbRnK1/kpp5/Kn222/bRr2k11/rbPRKB2/bN1knN2/pQb12Pn",
  "PqqKr3/1kB32/n1QRnrR1/KKp3nB/NBBQkQ2/k1N32/11Np2k1/QQq111nb",
  "1kr1Q1N1/2N1PpNN/PqNkbP2/2PqKP2/1q2P3/p3BR2/P2nnq2/B51Q",
  "1QBKb3/bbNRNq2/bPRQkpp1/21qP1qB/b1bQnPnB/bPK41/r1qnK1B1/NQQBKq2",
  "rk12Q2/1qNqPR2/1nbNN3/1qKnKk2/qR3K1P/bQPRRnk1/qbkp2rR/B3BRk1",
  "nqN2q2/P1N3k1/bqnN1N2/NKn3rK/QKP5/1PBRn3/PBk31R/QkPkRB2",
  "bPRb4/PNPkKN2/3nqR2/RPnRNQN1/11nb4/1nRqbbQ1/KNKNPq1p/1b3q2",
  "bqBkQK2/nNQp1bN1/KNrrPNQ1/RBQnrK2/bqNq4/qPbkr2r/qNNqkr2/RPn2b2",
  "12pk2P/1kr3p1/2nQR3/QkPqn3/nRBQ2Bn/brR2N2/q2rQ3/r2KB3",
  "P1Pr1QKK/R1QqBp1n/kqKnrKr1/1QrR2KP/QNr2kB1/B1rpNB2/qknB2KP/rpprB3",
  "1NNnKN2/kBprp2B/QR1KnKb1/pQNRRB2/P11KQN2/NqQRn3/NrbN3b/rQBKrB2",
  "PkkqRPp1/2N1Nk2/rB2KRq1/KnN1Q12/kbQ1RN2/bpkqPbb1/PKrrN2r/1kNKq3",
  "121p11n/nrr5/bRB4r/PKkkq3/q1qKQ2n/nRR1Pkb1/Rp2Pr2/prPnRpq1",
  "BkRb4/kr1BQ3/nb1QpKk1/1K2BqBQ/Bpbbbqp1/rkqrpQ2/BkRrBPB1/nkrkNR2",
  "BkPkn3/1NnpBN2/rR2Rn11/n2NNn2/nBPkbnq1/rqPbqQ2/kR21b2/1KknR3",
  "qp2Pq2/r1QQPn2/1RpqQ1qq/r32q1/Kn1Bpn2/R11Pqp2/Rp1P11PR/1BpNKBRr",
  "RnNB4/Q2p1b2/b11kKpb1/PR1N1R2/31Pn1n/KPpRnB2/rn1PkBQ1/1q1bKB2",
  "qRNqP2B/P21k3/qqRKRR2/nBQrRQn1/rBRpNb2/RNqk2q1/p21bK1b/BR1Qqbn1",
  "2kNrB2/BNRnbbbR/n2pK11K/K2rNQrr/qPNn3R/KPq1pq2/2nkq3/qnNbr21",
  "QpP3kK/21NRbP1/KNP1pn2/p112Nr1/knB3bQ/BqprRq2/nk1BQPb1/Bkbrbnp1",
  "rqnPb3/kQb1NRqR/BbNKP1Nq/p1bPrr2/bkKpK3/1n11R1Qp/NP1QKQ2/p1P21Nb",
  "Bk1PkQ2/kQrkK2R/NnKkKnP1/pbkbRN2/Np1BNKQ1/kbBn3b/NknQRqq1/P13111",
  "RQ21bk1/rRRbR3/qbPBrN2/P411N/NnkRk3/qNRp4/r3PQQ1/1rkb31",
  "k21RN2/rrbNk3/KRnPRr2/1b3q2/BQpBN3/RQ3NNq/Q21Q21/p1N1b1b1",
  "pBKknq2/pR11P11R/1Kn3bn/NqbkQKq1/11nQRPqR/KqBNRpK1/1Nbk31/Brqk1r11",
  "q3NNn1/R1r1RRN1/21kkppb/qKpq21N/1N2n11N/1Bn2kP1/R2NR3/1qkpnp2",
  "B3K12/1qP1RnNr/Qr1p11Qq/1kQqPQ2/RKKpQrp1/pPPnR3/bpqr2RQ/nkrbn2Q",
  "rPQP4/PK21P2/RbpkNP2/q2pPRq1/RPqBkr2/qBknK3/qRnPr3/NkpRkK2",
  "215/11nrRk2/NRRNn3/Kp2brq1/2nk1n2/nNnPQ3/r3r3/r1prqpk1",
  "kkN1b3/KB2bbQR/1qQ2rPP/bQPnP21/bpkk4/2nqpP2/KbR13K/RK2bp1p",
  "k3p1Nn/1qKrkP1P/1qp3KK/1QqRNq2/kPNQ31/1QQBn1rB/qQRKQBpR/N2PN1R1",
  "Kb1Qrp2/pR21K2/k1b1Krq1/pKQqp3/21KRkB1/11rQbKKQ/1p2QnP1/kPbnQB2",
  "BBqnP1Np/1BkRnq2/RQpNQNRR/1n21Bpq/1PPk1n11/rpKpb3/11BqPp2/QQkppR2",
  "PN1NkK2/b21nB2/Rk2RkNB/NKrrQ3/knbPKrr1/p2rpBP1/2kpBq1b/b1K1kP1q",
  "21BRbRB/nprn31/R1K2r2/qQrrk3/RPQb2nq/BB2k1Q1/11QkrrR1/RprBq3",
  "n1Rr11qn/k1krq3/NnNBr2K/PBRqn3/KPKnkPP1/1qQpRr2/1bpK4/11Kpq11P",
  "Q1Kprp2/p1qRnp2/RqQ1krqr/1b121b1/Brn2n1P/kRnpNbp1/pNRnrn2/rbnKb21",
  "PQRk21P/R3rbQ1/qPN5/RBnQK3/n4bK1/rNbqP3/r2R1RRb/P1PrqR2",
  "1NKNp3/PqQbKpP1/bKQkqP2/1b1B1bNP/RQ11bbb1/Prqn11k1/k2qb21/1QnPB2k",
  "N1QQQKb1/1bqRkrKK/1RnkB3/KQBbpqk1/1pkNkkR1/2211r1/n1rBq12/QBqPqnQ1",
  "1QnQrq2/nb13K1/NrPNqr2/QRpRpbK1/1Pq2QpR/1p2kpRp/nKBB31/bb1RbB2",
  "bNPRQ1Q1/bNB212/1RQ2Nb1/BqPB4/kBrkNR2/N21kRp1/rrKnKr2/k1nb1P2",
  "PQ2Rqr1/pkQPBN2/knKkNk2/b2q31/rpNK2N1/NBKnbP2/12N3b/1krQ1PP1",
  "RqRn4/2KQ11bR/RKrQqp2/NbNRb3/1P2kb2/PqPnNB2/qbRPbPK1/P111bQq1",
  "qk1n211/1bnQ12k/QBPqQqQk/nkPkK3/PBB2RBk/NQKQbNNP/QRBBk3/pNQpRn2",
  "pNR1P1N1/RKQrB3/kpKbp3/RnbBBnb1/nRKp11br/P1KB2R1/qr1BpQq1/1qQbP21",
  "KnK5/P1KN121/1p1QrB2/P1NP3Q/2Kb211/pnQR1n2/1pNqnR2/1BqQRk2",
  "112qqk1/rnQqQp2/qKk2B2/NKkBNK11/QRRNN3/kKKR4/Nb1111R1/Np222",
  "r3QQ2/qPkBPBNr/RRqqkbR1/b1NRpB2/RNbk2p1/qNp11RPK/qnpnBP2/pnRBRP2",
  "PNBnr3/q11qq1P1/r1R1KnRR/RRQ1Kn2/qrq11k2/QP2KRB1/1RPKnr2/bqNp2Nq",
  "kkBRKk2/rBNrpp2/BbRbRN2/rBNpN3/1r1RRBR1/BkRB3Q/qKNN1BPB/2rrKnBn",
  "p2KpBNr/qKnnNN2/Bqr3bb/KQ1NqR2/R1QR2p1/KbNRQnQ1/kpkrKk2/KNNrRKrP",
  "bB11Q1rp/KPRPNN2/NnpNqP2/RKBb3n/rK2pnK1/Nr21RB1/KNRB4/NK2qpq1",
  "Qrnqb3/BNBR1Qkn/bKQk4/rqpPNq2/1RPKkBr1/K11npKn1/bQrQKQ2/kqQn4",
  "qPnkBN2/KqBbbn2/NQRpKQNN/q1Kn1kr1/PRRQRp2/qNbNPPR1/11NRQNrn/11321",
  "nqn4r/Q1pnR3/NNrKqB11/rk3B2/b142/1qNRb3/RqQpBn2/n2kBRQR",
  "bNP1Qk2/2rqK3/KrRN3R/p3kr1N/kqBnP3/bpK5/KpKrr2N/k2nq3",
  "R1K1Qbb1/PbRKbnk1/npqnQ3/1QbKnnN1/12QK2P/qnb3p1/PbpNNB2/nbB1k3",
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR/8",
  "1p2B1b1/Nr6/npbK4/pPbkK3/NnkQnNbB/KPb1PnN1/qPRR31/brNpPkr1",
  "qQnqRr2/RKkp1qPB/kpQ1r1N1/b11bPPr1/qR2B3/1kpBnN2/QNNbKpp1/k3knbb",
  "Kp2nb2/KQrb4/1Pq21K1/rqQ1r3/Q1RNrbB1/qRnrR21/nbP1R1pQ/bQb2RN1",
  "kk1qPKr1/p3K1R1/rnn2Q1p/qNRb4/qPBrkN2/K1pp4/KPqKQ3/kkP221",
  "nk111pPK/1ppP2nk/rR31kB/QK1nnP2/2NKkqq1/P1N2N2/n3bNB1/qBnkQr2",
  "NBqPN3/RbPqRBK1/2Qn11PN/qnQ1nb2/kpB2nBB/2Q4b/Rkbk4/n1RNN3",
  "qkNp4/RRKkBQB1/R1nb2p1/Q3qNP1/RNrK2Q1/2b5/KpNKB3/BQpRnnN1",
  "QnqNr2P/QN1RNNK1/qnPqR1k1/qQRKr21/pBR2bnn/qK21rKB/pNRq4/KBrp3N",
  "1prNNRkB/BrKqRr11/kkbNnk2/Q2RkPb1/Q2K1BK1/p1b2K2/KR1bbr2/1BRrr2q",
  "qKRr4/nRpKPnr1/3R211/1qQQRPqr/PRkK4/qpqk4/prKNB21/kPb3Qn",
  "rnkNR3/1pK41/1BNnBkK1/QpNrKpk1/1PRNrP2/pnqk1p11/1rRRk1PR/qRbN4",
  "bPq41/P1B1bkn1/qNr2QQb/BNbrQ21/B2qBrRr/1Q1qRqq1/qNNNbb2/KkNNp3",
  "NPk2rB1/RQ1nP1N1/kQKPBp2/KKNBkR2/1BNQBk2/pKPpr3/11RNPn2/qQn2bB1",
  "1Rbr31/B1nk112/pkQB1QP1/21BKBb1/brQ5/BqR1bqr1/bKnKkQ2/Kn6",
  "QKnKQqr1/kpqn21P/q2BRPK1/qbR5/NNqPPNR1/1npP31/PQQNnqpQ/PB1Nrpq1",
  "q2nRPP1/kQkPBK2/2Pqk2b/QN1p1BKP/rBb5/2b3K1/15nP/1b1kq3",
  "NBPbr3/qQrN4/PnkpP3/221rB1/qrQrK3/rN11k3/BPbBPqp1/kqqb4",
  "1QBp3P/Bbb5/R32p1/n3QQ1r/kkrNK3/R1PpQNN1/NqqQR2P/RNKb4",
  "k2rNbP1/pBkRr3/KQrP3K/QBKpK3/PKq3Qn/2bQqPb1/BkqNbqQ1/K11rp3",
  "bNB2BbQ/RKNQrrq1/q2Bqpb1/BnKkp2N/2NnPP2/1Rnr2Pr/rb4Kp/qbNqB3",
  "KpKQKP2/11r2Kpr/1NBrNQn1/nrN111P1/BbpNrkR1/qkqqB3/rr3qB1/Kn4bp",
  "Q1NNbKp1/p1nKkNr1/NBN1nR11/k1RNR3/1qk4N/bnnkQ3/qnrkpr2/PB1BKR2",
  "pQ22r1/1Q21NKr/KPb11qP1/bPRPQ12/QRRPrk2/npQRBn2/PbnKKNQ1/1nb3RN",
  "kKn3N1/pbrpkn2/1nppKp2/kn2RQN1/rKpPr3/rqRkpq2/rKn4P/1Rqkb3",
  "qbbqrnQ1/RQkpk3/bBnB3k/bqqQK3/qKK1BB2/qPnn1rnr/Rq3Kb1/BKBK112",
  "BBNqnq2/kB1b11q1/RnK11k11/PRbRN3/K1K311/r1NQr3/BKKPRk2/nQN2BpK",
  "kn1PnrQ1/11BbnQ2/qq2pq2/B3PQK1/BbPRp3/NRn3N1/1p2nq2/q1K1r11r",
  "k1QkRR2/QK1NQnpP/kBRP1rN1/K1pBK3/q2RRpbK/pprrQkP1/qqqrbr2/p21np2",
  "K1P21qp/R3rqnn/P1qBkqn1/p3P3/1kpBBB2/1B2kNK1/NpBP4/NQbqbrq1",
  "pkRRNR2/3kQ3/Prb41/pk1KkBkN/p3PNQ1/KBrn2B1/Q1p12Q1/pkbpQ3",
  "QkR1Kqr1/kBrNQQ1n/kbPkp3/b3QNNk/RBbrPP2/NNbn2bK/Q1bq21B/2Q1nB2",
  "2pRnR2/Pkb3qP/pBPnn3/1rqpN3/bKKQ4/krQn1b2/qBBP4/QQKQbK2",
  "KbqrPr2/1rppR2k/13nB1r/PnnBNnnK/q1qNPqB1/Nr2rnK1/QkRr2b1/1Brrb3",
  "pnprpQ2/nRRkN3/NknRPpr1/1ppb1BN1/KB1qBNr1/11BBN3/PNbN4/RqppQr2",
  "1BpRpN2/pqKrq2n/1K111p2/PpNBkqN1/PrK11qPq/pnknR3/NKnBn3/qn2qQp1",
  "BnK1rNKN/r2Kb3/bpqKKpK1/nPKkn3/BPr2R1K/kbQ2BN1/P1BQKk2/1KQp3k",
  "1nqpbN2/pbqQpR2/bP21PNb/NpRbqK2/N1pKRn1Q/nQ2q12/11p1QqB1/Kb3Kn1",
  "kKq2k1P/QpPnrqb1/krN31b/1b2N11r/RQ2kBk1/r1r3B1/r1k2R2/rPQBRN2",
  "rr1pNk2/QNQPq3/kQ1RqPp1/R1bbPbk1/K1nkNQNB/1KR1b1b1/k2k22/NNBQ31",
  "rpkR4/2Nnpnp1/NPb1Pbn1/pPPBP3/PNpNbbK1/1Bk5/bPqrNn2/KP41B",
  "qPnQNNQ1/1r21QP1/1pqkPk1R/qPqPN3/p2p1pkQ/PBRBR21/qk12BQ1/QkRRpK2",
  "1NrqBQ2/Kr21p2/qpp3Kk/PN1PRN2/B3Bn11/nnPr2bQ/21qB3/1NKBKrp1",
  "BQnqbPk1/kQbQ4/bKNQpr11/n1bnqpp1/prbn1Qn1/QR1brk1k/pBBQnB2/11k1qq2",
  "11KPRq2/pKkKrN2/KNBN2q1/N2krq1N/qQkPkq2/1PRqn3/1b3qNp/1Pk31k",
  "Qkqnbk2/rbb11PN1/kk3rb1/qkNPP3/k11bkb2/QqNBP2Q/K2qkqRk/rNbN3p",
  "qpPb2Qq/krN2Qqp/1Kn1nrP1/QBr41/1QkrPq2/kPPQ1kb1/RBkpnp11/nnKpR1b1",
  "1QnBKb1b/k21bQb1/N1B2nQk/KqbRb3/nKQnQpq1/prK4R/2nBb3/q1PPrq2",
  "BN1Q2R1/qQ3qpN/P11b1k2/1rk4K/2RKNR2/P12rrr1/bb1qB1p1/1kb3bB",
  "pnNq4/11qPkb2/pn1rPN1b/21Kq3/1nnn2kK/pkr3Kn/knbPKK2/QrQ2brq",
  "11KBQ1r1/K3R3/1kBP3p/KqBk2P1/2B1pr2/Nb1p1Pb1/Q34/BnKRQPq1",
  "qN2b3/kKnkRPP1/qbNB4/kkQp4/NRqbppn1/PBPKppB1/11nrNpRr/Qq1R2q1",
  "B1RpK21/KkbQkN2/11nK2BP/K1Qkb3/1q3q2/rbpbnb2/QkNR31/1nqK4",
  "rK21rBn/2QbKn2/1nNRbbQQ/N3kK2/kBKP1q2/p2nKKb1/P1NnqnpK/qbKb22",
  "qrknB3/p2k4/Q1rQqQP1/1KqbkQ2/pk3Kkn/kkKp2k1/1r1Qp111/pkPrKK2",
  "Kp11k11Q/qrk2rRk/RrqKRbRq/QKqpB3/rBbBP3/bNBn1KPr/1nKk4/PQNRKR2",
  "B3QB2/111PNnN1/bQR2Nb1/Nnnp4/k2k2pP/p3PBkB/PRK4R/NBQBnr2",
  "p1rqrP2/n2qPBBr/k2rNpp1/PB1KRn1R/n61/P5K1/QnB2k2/qK3qq1",
  "kR2RRkn/BNqr4/PqbqQrK1/qKK3KR/k3B1Bp/1bNpqr2/r2BN1qn/rpqr3k",
  "qRpr2Q1/2pRbBK1/1nRBQnn1/p11RkP2/kPK4N/Nrn11P2/BRBNq3/NkBp4",
  "KKpbrKK1/nN2pqR1/RNrq3K/Qknq2b1/K3kPq1/k1pbPBN1/NnbN31/p2n4",
  "ppnNR3/N3pqNK/BB3b1B/bkKrP3/RkQB4/qRRpbBr1/QPpNK3/RQkrkpk1",
  "1pN2qkN/1QkR2q1/RNQRRQ2/Bnr11q1q/nP31RP/qK2b1B1/rbQbN3/q1PK1kQ1",
  "R2NNrr1/1q11kPP1/nrRpPn2/11QNP21/K1111Bnr/K2R4/pNKRBK2/pkqrBPN1",
  "kQnpPR2/Nkr1n3/qR1Q1NN1/K1QBn3/BnRqr3/p12BpKK/11knQ3/NnnKpb2",
  "nKbN4/qPrkN3/BqBQpqr1/bKqBq2q/bnQrQ3/NK3BB1/1kRnkK2/1bRP4",
  "1NN2n2/KkqKq21/1qR1r1n1/kNk2N11/1Q1qb11B/K1r1r3/bKRKPQ2/2PpR2Q",
  "n1P2rq1/2bRNKNr/pQbbbK2/bP1K13/1RkKnr2/KkknPPqr/brNPnb2/kRBN2b1",
  "RQ11RPqN/Bpkb2PK/NQ1pBRK1/K2nr3/1R1k1prR/Pb11qp2/Rr2qB2/RqqnpB11",
  "N1rbb12/pnb4P/kPbN2k1/21PNB2/qrP11bK1/pNpbPnR1/11rkPr2/kKBRRPn1",
  "QQQb4/Br1R2B1/qpPbQPN1/NPPpkB2/1Brknbp1/Np2pQ2/BnpnQ3/KQRqRr2",
  "B5B1/rrR21n1/1PBpbrb1/Bpn22p/3rKBR1/B3bqP1/K1KnnBbK/KQ3RBp",
  "KpRkQbq1/rQ2KQ1q/1KKPK1Rq/Kp1pr2N/knqrbQQ1/qPbn11QN/ppB2rKp/bB2rp2",
  "b1QprnP1/Q21211/qnr11p2/B3Kqbr/rNNK4/PppN2rk/Kk12BbR/b1rQPN2",
  "R1pbQrR1/Kkbk31/r12KnRk/1n12NK1/k1RpPKN1/1NpBr3/Qn21qkB/1qPqqNr1",
  "1PkQNP2/RQQQnrk1/krqK4/1nKKpk2/11n21kr/qk1KRp2/Q12pp11/b1r1NR2",
  "1bpr4/bqnRBNR1/1nPnB1Q1/rQKnR2b/1bNNp2K/1nbR2p1/1qkRNpk1/K3nbQ1",
  "kK2RN2/rPkbP3/1kb1bqb1/PbkRP2B/qR3kQK/bp32b/RN1r1nB1/P1r3qr",
  "KrQNn3/QRPQKrR1/1nqB4/brqQqP2/Rpbn4/RNq3Pr/3krk11/NK2P1R1",
  "2pkkRk1/bqkqP3/b2KN3/krQbk1PP/3BQn2/qRPQnq2/p4k1q/pbP11B2",
  "RBK11QKR/3PNQrB/K2Qb3/kPPR4/RkqB4/BRRbnqp1/KbBkPk2/PK2b12",
  "Pr2b3/Q21RrR1/Rnq2bK1/qkK1KK2/kkqRnKKQ/RBkkRKp1/n1RRbr2/RbPKp3",
  "bBnR2Q1/1Bb3N1/bK2N1pN/pQK2KRB/NPrPnqR1/rkNprq2/1q21Rq1/PBPNp3",
  "k21kK2/QpNqPk2/b3bPp1/pP11QpKB/pq2Nq2/pPbknp2/nK6/nnP1Qkr1",
  "1QbRNB2/KPrkBrk1/nQrkR1P1/brN1P2r/bKQn4/1nbrKB2/1RbqbBr1/q312r",
  "K1NpRKQ1/qBKQ21k/bR3kb1/1Rqqp2K/qp1BQ11r/bKBkrN2/1nKqBK2/rnnnbp2",
  "Pbp21kP/1K51/K1n11R1q/KqpBN3/PbQqQKk1/11B14/Qbk31R/K11bR21",
  "B1RB2qn/p112RQ1/bkknB3/bqPK31/R1p1rN2/r1RQN3/q4NN1/qPRq2NN",
  "kBBk21b/161/pB2R1B1/kNpKq21/KkKNp3/PRK1R12/1rP1brP1/Q3rNK1",
  "KRppQR2/kn312/B211pbQ/pn1n2kB/kn31qr/RKBNp3/11qqK1bk/rbkb1BpB",
  "QqB1R1rP/1pQ32/bq1Nrkp1/1NBn4/q1BQkRb1/qqbRNB2/B2N2Pn/RQ1BNbnP",
  "r1Kr4/1b3P1R/NkkP31/Q11qPQNB/1QkPQKNk/B1KRKB2/kQBBqk2/11KK4",
  "bk1QR3/pQQb1111/rrqnQN11/kK1KrqB1/pb1Pp3/bP6/p3krnq/RpRqr3",
  "nPr1P12/B1PkqQ2/rpRk31/QNNr1P2/1qPp4/P2qRkb1/1KPNPn2/kQr5",
  "NrrKKbK1/kRN41/BNK4b/PNb1Kkp1/B11kqKr1/bqPrr2K/KPBrP3/1rn1r3",
  "R1BnBQnQ/nBnKB3/krrRBRR1/1Rnq1bK1/NqNqBPP1/QQ2rNR1/BQpn3N/qnNqpP2",
  "rKRpnKQ1/kQNNr3/nR11bRPk/12KRp1n/BnR4r/R4br1/r2pNBB1/1rbNK12",
  "rb1Npk2/rp4bP/rrprQqk1/q1QR121/P2QnNb1/N3n1B1/1nR2K1r/brKP4",
  "qkKQRK1k/QNQn4/1nrK4/qk411/KqrPP2Q/Pb2P1K1/2nQ4/N1kPb3",
  "bQB11k2/rQb2Kq1/R1pQn3/bnqbBN2/2pRkKn1/12B1nb1/nRpKnP2/prKB2q1",
  "K1rn11nN/N1RPkbN1/1R1Bbr2/KQnB4/pnRpQ3/bRn1QBR1/RbKPrnN1/bR2brKP",
  "R111Rr1Q/Kk1b1p1q/P1nPPqN1/BB12Qq1/Q1RNPR2/BbQpQB2/RqRbR3/1r3B2",
  "Bqr1qpR1/K1p2nP1/qqrnNr2/bqRRBB2/qRBkrK2/rbPn4/RkKQNqQ1/b1prBq2",
  "2kb1pP1/pPBpN3/b23Kk/N1q32/N1KQKq2/Nk1Q2Q1/1Nb11Nn1/qpKN2bP",
  "21b121/11qKR3/KqBBKNk1/3nPpN1/RbRrB3/12RpPk1/11121NR/Qq2QR2",
  "1k1bNK2/RnRpNpR1/NBB2rrN/bNRRk3/r1nrn1B1/nPQRqb1R/KbPnk3/2PqPkN1",
  "nrRqP3/bnBNqq2/pp3r2/qRBQNQ2/QBpp22/KbQbn3/Brp3q1/r1rpQRR1",
  "RpBQK3/1kKq4/RNN1NR2/pbpRQq2/nkkb3Q/1BrQP3/pQnpPr2/QRpP31",
  "BBQqq3/bq1p2N1/pRR2npK/rRBn2pB/BB2BqPn/Pb3K2/PPBqkBrn/1RKBpBQ1",
  "3122/RNb4N/1bqRRrN1/q2kbbp1/2PPB3/Q3rBK1/1pkBkNR1/1BNNq1Qp",
  "QBbrbK2/prBbkB2/nP1bkK2/1np2k1b/q41P1/QQqN2n1/qbkN2PR/2qRbpn1",
  "Kq4Nn/BqbPb1b1/pPp1pQ2/1qK1rR2/R2qQBn1/PpRpb21/rN2K1Bq/BQQRNrb1",
  "p2kR1Bn/qnnkR3/k1NNqr2/nRkn3B/n2krB1b/BNBK1KQ1/BNpRq2Q/bNqPRr2",
  "KPKPbR2/12KR1B1/11QqQq2/11rQB3/rK1PBkr1/1NBkQ3/PP1ppkK1/1pkpp3",
  "1qRK2NB/K1NbK3/kr1n31/Qq1bQPQ1/b2q2r1/KNqRBrp1/p2qRrp1/2k1QqQR",
  "1QqPrN2/NPr11n2/q1nknKR1/k11r1nP1/bnQn2RP/Qbnbq3/qrbb1kr1/bqBqp3",
  "kkkNr3/1PrRBPK1/kKNP4/r22bq1/npkrk3/Rr22Pq/PpRRpN2/1PBPkP2",
  "nnnBB1b1/kqrrKnRN/Qk1rRRn1/2rBrR11/qn3Qp1/PBq4b/21PbPbk/rRqRnPq1",
  "P3rpk1/rBP1nbkN/nbRr4/PP1nPrPR/Qqrk1P2/QN32q/NbB3rb/BKnP3p",
  "Bq4NN/N22BBr/qQK5/qBk41/NB1Nn3/Qb1qn2b/bqqqk21/RPr3pn",
  "Rbqb31/2BkPq2/1RRkBrN1/r1bKR3/pNN5/rnkBn3/121NBnb/3BqKq1",
  "nKBBQ3/kBNKqP2/kNB11qrQ/KBkQq3/q21BQ2/2PKbbr1/Bk2Q3/1p1KbP2",
  "1Bn3p1/k4n2/k11NprqN/bPqQ1n1r/nnR311/pPB3bR/KprNQP2/K3Rn2",
  "RqKRqbN1/Knbq4/1q111rp1/nPqQRNQ1/BnkKq3/B1nnR2n/pKpbqp2/1kkQBK2",
  "nrkKBK2/K4b2/Np2Pk2/n11KbBN1/1B2kR2/RBrRK3/BqpQPKB1/pKRrnrr1",
  "pQ1QPp2/q21P3/KK1NPrR1/qq111nNB/QQb32/PpB1RB11/1r1RpPb1/BPqRPP2",
  "QQ1NnBbr/Pnr5/4rNPP/Kq2KrN1/b2k2Nb/111Np3/kbQnkBR1/qPp1BQ2",
  "brqp1pQ1/nbPnr3/QRqKQr2/12rBQ11/PNPBbBq1/N1R212/1b1BQ3/Rpnp4",
  "bKqP2q1/NbQ11KnQ/QQ1bN3/b3NB1q/bQnbKrnQ/Bpb1bPK1/13Q3/nQqQBN2",
  "qBkqqp2/3BNrq1/11nBP2r/1K2nQr1/nKqpnk2/rPqN1NN1/nrNPkr11/1rQ1112",
  "BnPppKBr/RNR1npK1/pBBRq3/nbqqq21/rQbNPq2/RQ6/R2Q3b/rpqPQ3",
  "21KQKn1/BQrNNb2/r2r11r1/kPPnk3/BK321/1kPBPK2/qkqb4/qBqr31",
  "1Kp1NR2/2RBnRq1/kpk3kQ/PpnnPK2/bB6/NR1QQQq1/kr2kqrk/bqNqRbQ1",
  "bbkNn3/qRBRp3/N21rbQ1/21pb11N/qKKpqn2/rk11PP2/RbQBK11R/Bkk41",
  "NB1nQQ2/bpP5/1B3kQ1/BbNBpB2/QbrN4/RNbbRq2/n11KRP2/bRRQQb2",
  "k11N1B2/NKbqn3/Q1nbNPb1/B1qPNrQ1/rnRQB3/kKQQr3/QnKRp3/1n11qkn1",
  "QqQ5/rNq12Qr/1K11B1k1/K11PqR2/RbnpQ3/kRbR1B11/rBp2B2/3qp1n1",
  "N1PPpn2/N111RPp1/q1NB1Pr1/n2q1N1q/1RRNbN2/qnp2Bn1/QN1QRq2/Q2B3n",
  "rk1Q11Rb/RKRqqbn1/11qrbn2/1qP1NBk1/1kN4q/prnBRnR1/R12pq2/qpbRkp2",
  "n1nkk21/QqpRbP2/Pr111qPq/qKBR4/R1pQrPK1/kNQ2BKP/n2QP12/qkK4R",
  "nr31bk/Nr3kQ1/pQbPR3/RNPQp3/BKQ2111/qr2B12/Q1B2kQn/QQPP1Bbk",
  "Kk2Kq2/B1B1N1qK/NkQkPrK1/b1BpRP2/krkrq3/RNnK4/KbRbbQP1/1q11kPp1",
  "R1pBbRq1/Bp42/1NkQN1nr/1k1bbbQ1/QNp1p11p/Nn1Rn1q1/p1PqkR2/kqRQPN2",
  "KQnk4/BNNkb3/RKkpBrQp/kN1nr11R/n2RNrn1/QKNrRrk1/qKp4r/Qrpqpr2",
  "qq1B1K2/bBknrrR1/NkqB4/R1N1qPBB/n1Bnb1QR/P21qQ1P/BrBR4/QR1R1k2",
  "NPQBQkP1/nNPRP3/Qpqbp2b/qq2BQrb/P1qpRPr1/nqpq2B1/nKqB2kn/PbRRp3",
  "K2nkq2/Qb3nQ1/R1p3Qp/Br1kQ3/p11q1KKQ/QK2kPK1/bb31K1/1p3Qp1",
  "NBNnK3/n1Rq3p/Q2pKP2/QPBPpn2/BnB4P/kQRpN3/Qrq3B1/2BRbQN1",
  "1qK311/p11rQP2/21nQ1bn/nrNrB3/NnK5/1kPNR3/kk2BNbq/Pb3QqR",
  "r2rkQQR/BpRK2P1/qRK5/nQ1QrRP1/1r3br1/Np4Kn/kN3K1q/111rbbr1",
  "11QP21b/Pq21PBb/1r1RKbkB/2qbPB2/npBq4/b1N1R21/BkkB2qq/121pb11",
  "PKPQK21/PBPRqq2/1bp5/qnpNQ3/b1kqR3/Kk1kKPp1/nkN5/2Q1QKr1",
  "nBRR4/rqnKrn2/NPNkpK2/N31bq1/Bp1PB1qQ/RNbB4/1KPPQb2/K11QqRKp",
  "pNBkB3/BbprP1qK/2nqNQ2/pR21Kq1/kKB5/kKq3B1/rqRKQ21/nNbNqn2",
  "QRrrkQrq/bnr2pK1/3Qp21/n1bn1qR1/bPqNk2R/nP3NQQ/1rnB4/2PKBnK1",
  "kb11qq2/Pr3B2/rbN5/kQkPp3/nk2B1nR/qkpK4/qQ1BQP2/nK1rp21",
  "1qKr1q2/1KBRnk11/KrnpPK2/rBrq31/pKnPN3/P1pQnB2/q2bkPk1/q22N2",
  "RrrNb3/rbNkr12/KQkNp3/RRrRQq11/B2q2B1/KKN5/KK3Nb1/1bpK112",
  "RRNRRQQ1/rBnNQr2/n11Qkp2/rpRBrpnk/8/ppnP4/B2q2kB/bqKBnn2",
  "PPQpQKK1/bkPkr3/pBqkr1P1/QB21q2/2Rk3k/QRNK1b2/kkpk31/Qprpbnk1",
  "qBPBBn2/1kqP3b/r21bRPP/RK3qr1/pNQ4k/B2pq2P/kRrQb3/krq11qn1",
  "PnNb2pn/112bKK1/P12Prk1/rKpq4/KnqK4/RQnbpN2/bqRnqQQ1/KN1PBpK1",
  "rrkB2Q1/PPRr2Q1/bnPnn3/BrnqB3/nNK32/P11pRQb1/NNrn1Bnp/1Rbq4",
  "KrB1R12/QKK1RrRb/rPbKrnr1/BQpB4/1KnPnQ2/N2bPq2/1qpq4/11PR1pp1",
  "nkNNR3/bn1rk1B1/14Kn1/rRN1Q2q/NpbRn3/QQ2bqBP/2Bb21n/QpNKkQR1",
  "pkpnQ21/knPrp3/1Rbb1p11/Np2rQ2/1111R2r/pQkQKP11/kp2QQqR/PkpQqpq1",
  "K1BB2Bk/1bkrr3/1QKK1RP1/Nbnp3P/3pnRk1/2rkr1PK/QBPB31/12KNnK1",
  "PPQB4/2bnB3/bBbKR3/kK2Nbk1/3r211/Qp4nQ/qbP1Rnb1/rRB1r21",
  "BKpkB3/n1K2n2/kPKRQRkb/Qkk41/1NkPp2K/Nnr11q2/1bP5/PbrQb3",
  "13kBpn/pNk5/RKrbP111/bqRKBN2/rBrpn3/KPnQ4/3qPQn1/bbb31K",
  "1nPPPQ2/Q1pQRQ2/R2BK1q1/q3NNbK/Bn14k/3p2Q1/bb2b21/KbQpKR2",
  "QqpnNnP1/pN1nK21/kqR31p/b1N1K1Q1/nprQQb2/qb3r2/bkNQPp2/ppP1NQK1",
  "q2bqk2/RqKBq1r1/p1RprKP1/RPpKr3/P11kR111/n111121/4NQPP/NBrbB2b",
  "1q2n1RQ/BBb3bq/1KQqPkr1/r1bn1B1n/QkNBn3/QpPQN3/rPbRbbr1/NNBrrknQ",
  "kNNkkB2/NK1p3Q/Rprk31/N1kB2QN/1K1Nnq1q/2rrB3/kNQPR3/brnq4",
  "bQK1kBBK/4krk1/RKQ221/kQBRRRK1/pKNqkP2/Qpkpnrpn/2P1rR2/PpbpP3",
  "QK1Pppk1/QN2KrK1/1Q2PPk1/2q32/1kNq2pn/P1QKQNP1/Bq4N1/kNp111Nq",
  "n1kPn3/BnKk4/r2qPprP/b1Rp1bkq/pnrnQkK1/NN4Rq/rqkkQ3/p21R1q1",
  "rRRPR3/RK22Rq/NBQ3P1/PK6/NQ3RR1/k3q12/QbbpQQnp/1kRRpn2",
  "Pb2pr11/q2Bpkk1/qNRbR3/r1Qbbprp/Bq1Q11bk/pPBbKnq1/rBpRQ3/KR21pr1",
  "b2Kn21/1KK1nrp1/nqpRKbn1/r11prK2/1PBbr1P1/qqrKbk2/RqBpQ3/1bqP1BR1",
  "R2qB21/kPbrK1NK/qpKQ21b/B3pQPB/nRRbN1R1/rKK31K/QrRrNqRn/P3NQ11",
  "nN1r1RB1/B2nBQ1q/nrppQ3/Kr1Nq3/k11nKP2/QNbnpbB1/RR2Pr2/nKKK4",
  "bpN1Q3/rb1RrPBN/R111Q3/bnP3b1/qkn1bK2/R232/BpNK12p/BRPPK3",
  "b1RRq21/NB2b1Kn/p12N3/rNPPp3/1NbRk1K1/kk2Qbpn/nKrKkkPn/21R11q1",
  "BK6/1rRPbbQ1/qBBB4/1QRpk3/nKpqPb2/1qkbP3/kr1Q21q/1Rr11Nn1",
  "KpRb1rP1/nqbQKkK1/pQ1pRRp1/qK2KK2/P2Qkqk1/nkPP3R/k1Pr31/P1KQN1P1",
  "nRpQKrq1/nPPqqkk1/nbNbb3/NQ1Nr1K1/B2n21K/13q21/KqN12b1/kN1PN2p",
  "Kn2BkPq/bPbbnb2/Bn2bn1p/PbBnkR2/P3P3/BR1nPqPp/nknKrn2/KknRR3",
  "PqQb1111/R2kk3/rn3k2/n2Q3K/QRBRqP2/kq6/QRNRN1PB/NKKQ31",
  "KQ3nbq/QRPP4/1bQq4/R3pNk1/QRN1r3/PrkQq1K1/1kK21kK/NrBqBPB1",
  "1ppQP21/Qb1rr2R/kRrkQKp1/2Qpk3/KNk111b1/bK1BRn2/NPRN4/1RnKqQ2",
  "NNR2Nkn/RbNB4/111BK1qr/qRrRKK2/NNP1qp2/Qnkr13/QnKbp1R1/nn1QRBRb",
  "Nq2bQ11/KKB4r/bpNPq3/KNqN3k/1pNn3k/1N1B1Bq1/nB1qbb2/PqKRPq2",
  "rBPkPRk1/Nk11K2Q/rn2PNkQ/KQNkk1PN/N2KRpp1/bBknb3/1QKBq3/nBbQ4",
  "n32Bp/1BprrQ2/B2NQbpn/1NQKQb2/Kk3Qrn/R1QNP1nB/BQBpKkr1/q1Bnn3",
  "qNrbpRN1/BNrr4/RKN12r1/BQ2BQKB/rKpbNK11/RNbBRq2/rK2rn2/np1ppkR1",
  "kr3brn/Kk11R2Q/kQKknRb1/QKBkq3/1P1bqp2/qnqr2Kp/RNpR1N2/1bQPPR2",
  "111R2q1/PkKq2r1/PQ3n1Q/1qkRk3/k1K1bk11/q1QBpP1B/kR1NR2Q/P1BPqbP1",
  "2BBKKk1/BkrbNP2/1NpNnPnK/PRR1PNN1/q1QnnNK1/BB2Rk2/Kb2PPBn/Np1Rbkn1",
  "1qKbp3/kpbp22/11rPP21/bkKbbNq1/1Nkb2RQ/rnNb4/1n1kb1kr/b2KKKr1",
  "2NP4/BpB5/P4Qp1/k2k4/kKRbnB2/K1nn11P1/1ppKP3/k1Kp2N1",
  "1bbRK2p/11qnk1k1/KQ1R11bk/ppbBRNB1/KbRRP3/1QQKkb1n/11P1Pp2/KPr2q2",
  "QqB3Nr/Pn1QrB2/RPknR3/Kbq3r1/NnbP2bB/1nq2k2/BNpk4/2pr22",
  "r2nqk11/kkrpKN2/bn1p3b/BNbqq3/QrP2qPr/KPpB2b1/Rn6/krB2Q11",
  "NQrp1RQP/Pb2KrN1/RNpqK3/BPNq3p/BrbQN3/QnQRQrQ1/QknrB3/3Q31",
  "1br1kRb1/kQk2rK1/nbPrp2Q/BrqB2BP/11QrBrqR/k1q1brq1/1Rkrk3/rKBR2pK",
  "2qkqK1r/Kpbn2p1/qB2nbP1/BRpNK3/kb11r21/bP42/nn2N2b/p1q4n",
  "rkqK1P2/q1RQ11pr/bNQ41/2QrRQq1/rNNqBN2/qkr2nN1/KNbRq3/PKNQBQ2",
  "rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR",
  "brPPkB2/311K2/1Br1KNk1/KBb3r1/qKqrpnK1/bqkPqbk1/qN31BB/r1B3Bn",
  "qpP2n2/RprkNR2/2k1QBqp/K11B2R1/kBq2Nb1/NNqQ1nn1/1N1Rq2P/nBb1n1r1",
  "1kKq4/nRqq4/RRKqKqKB/1KNBNBBq/PB1QnKKk/bnrnPQ2/Qb31KP/BnRB112",
  "PBPp4/NRkqnqkq/bBkpPNQ1/nbqrR3/bq2Qpp1/1bpR22/nRrpNN2/b1KppQRk",
  "qbqkKB11/k21N1BQ/NqbNKb2/131b1k/rkknKpQ1/1pKb3Q/kbBK1K2/BBK41",
  "KN2pqN1/1nkKqR2/KkNp4/1RQqn3/BnPQNB1K/RPk11QQp/Q1KPkpnr/k2Qbb2",
  "qknPQPp1/3nQP2/qRrKRR2/r32B1/pkQ1121/1RPn1pK1/2nRQBp1/RQ2RkBb",
  "nKQRn21/br1pr1rP/n1qkK3/n4KRb/BPpBqpB1/Bk1QnPn1/111qp1R1/bpkb4",
  "Pnp21N1/Nqpn3b/bR3KNp/1PN3KP/11Bn1pq1/PkbKp1p1/PkBBRkp1/PQ3rRR",
  "Bbn2R2/213qP/pPPpnR2/B1QqK2q/1qnBr111/pQR5/kbB2R2/kRBr2k1",
  "21rrk2/q1R12br/Nq1NPRKN/RKPbbK2/p1nnbB2/rpNqK3/RbQKRk2/PbQkbq2",
  "KRnBk2P/1Bqqpq2/KkNBK3/11RqK11K/12rBn2/NQ3Rb1/K2PkBp1/bnNnN3",
  "12K21N/1nNKNnP1/1PKQQ2P/PRPbkBB1/3kKQK1/pPp311/PbPQKq2/Ppr3Kq",
  "KpPnBK2/qp3Qp1/pkQNN2b/PQnQBqKk/11bnbBN1/Q1qBn3/NQRqPqk1/1qrnNRr1",
  "KRRnP3/RR11qBN1/1kRB4/r2q1BB1/1qQNp3/bnkK2QP/1K2kn2/pp2k3",
  "Pkrnpn2/bN4q1/KkrKNR2/bR21N1p/PP2bRbk/kKnQb3/1K21rr1/k111pRQN",
  "nKrBR3/pRBP4/b2212/k1qN2r1/Qq11BbkK/rBQP2N1/BBnnqq2/KbNKNKq1",
  "rb2rNrR/3NQ2B/2QqrrP1/nbkK4/bKPr4/n2P1QbK/Q1QknB2/K11qn3",
  "N1NbpPN1/p1nBK3/1Nbb2pP/11qkQ3/BNkkNQ2/12qNpk1/1BkbPn2/1nK1Rk2",
  "rqrk2pQ/RQnQKRrn/PkqQn3/RK3kRn/nq11QP2/kQnrrK2/nrQBKk2/qpnBQNr1",
  "bBkK31/1BBrRn2/Q1qnbp2/qkqqq1KN/BNKN4/RN2P1Nq/1Q1RKK2/NrPbb3",
  "11NnK3/13BN2/qBnB2Bq/rP5P/pr2np2/R1nqRnb1/21NpnN1/2B1Kpn1",
  "kn41Q/Qq1bKq2/kBnppN2/1QQNq2r/nN1QQqR1/Qnpqp11B/RqKRR1NB/PkNRN1q1",
  "R1RbQq2/PPNR21n/1BQqN21/3nk21/B2Q1pBr/kPRb2b1/1Qr1B3/1kb1Q1QK",
  "R211kb1/KNqRK21/kbq2RN1/2rK4/qQQpPr2/nPqQQ3/p1rkQpKK/krqQPpb1",
  "PbrbQqR1/kP1QP2P/rBKnNR1n/r1QRR1nb/NQbKRRpk/NnQBqQ2/NrK3nb/K32P1",
  "QRN1rBRB/RB1B2bq/BNq3P1/rk11K21/RNBB1qq1/pnp23/R4n2/qBbkQnkb",
  "8/8/8/8/8/8/8/88",
  "p1pPNPq1/rB1kP2q/nQ2RNN1/pQBqNNK1/2Qqn3/Kqk5/BPkPB3/bKbP31",
  "1PPkN3/1BNqRQ2/NrnK31/qqbRK3/rqkQq21/qPrqP1KP/1pk2N2/rQnrnk2",
  "RRkR2k1/RK2nBr1/rNPPr3/nKQ5/R1PPRBB1/kNbKK3/RrQQ4/qPRkK2K",
  "p1P1PQB1/PpQR4/1n2BRqr/1nRKk3/K1KP11k1/1Nb21K1/1kb2N2/bqnR4",
  "Qn3QNB/rNBBRP2/pq2bRrp/qQB5/2p2Qk1/Rq2qrp1/bK31nB/qkb3k1",
  "1RBrb3/K5B1/KbbRpR2/BqNrqB2/rpnBB21/K2qrR2/r1RPNQQ1/RQ3RnQ",
  "q1nBBRn1/Kp11k1r1/qNrKnKp1/P21nQNR/NPRRKQ2/BRqkp1B1/b311Qn/R2q1KP1",
  "BqKrN3/pp1PkN2/p2PNQ2/Q2qqP2/pn1nr3/QrRqNb2/kNr32/1bk11pK1",
  "nkKn2B1/K1pQ1nK1/kK2R3/1prr31/2Nqk3/1PrN21r/Nbk1nB2/pkkqr3",
  "PbrQ1KQb/PbNQNb2/bBq23/K12P1Q1/b1nkp21/QB12Q11/pqk1Rk2/QRbQB3",
  "1B1qBpR1/qbKQ2p1/nPp1bkq1/11rPNpb1/QNpQNB2/qqNqKRpK/nKrbbbQ1/NK2kpq1",
  "11Nk12B/RnbQb3/bN1RR1NK/BQ2NNK1/bnpNrN2/pBRBRK2/kQpBPpr1/QnPnQQ2",
  "NbRbpnK1/kkkNBB2/Rp1nNBb1/qkNRQ3/1PRB11n1/PPBRrrP1/qq21qq1/N1nNp2r",
  "Kp2qNbb/1qQR1p2/21PkKP1/kkp2pR1/qQq5/PbkPb3/q2prkB1/KkqbK3",
  "K1RPPrR1/NBRK4/pqrpR3/BbB2BK1/KP1r2Q1/n13p2/nqk2BN1/23pK1",
  "Q1RP21R/rb1bQnk1/NRNBrq2/nkbnkQ2/BQPRPN2/PRNrb1kr/p1BNBkn1/11NBq2N",
  "pPQq4/nknR22/rrrBN3/1prrp3/rPPR4/P2pQq2/KP1knb1Q/1r1PRrr1",
  "nrN2qn1/Kpq1N3/rkbnK3/nPnBpK2/QBbNbNk1/ppRkBR2/Nn21QK1/K2RRr2",
  "NRK21p1/BqbRPP2/R2k1N2/RrpNpqQ1/PBnRrN2/kp1n1kP1/q1qbqk2/nPNkQ3",
  "bPB5/Kq1121p/rrbR1bP1/kPp4B/nPp1p1Pq/kRbQn2r/NQBNpR2/RNQqKq2",
  "b1r2Qn1/bNn3N1/pbRRrn1Q/rBpNpK2/KN1k1Rnb/rbqPBK2/2B23/KQPN4",
  "r1rQQKN1/nPbP3b/QK1Bp1r1/pQRPbRnP/1qpP1NkN/P1BP3q/nqpQBP2/1rQnPn2",
  "RR2qRqP/pp1K1PP1/1PNqNnK1/kKrB4/nqk11KK1/Qkr21q1/pbr1Br1R/1RR3b1",
  "k1nkp3/111Knqk1/r1N1q1B1/pbR1BK2/Q2Pr1NQ/b2r1bR1/pPNb22/1pq1BkqK",
  "Nb2qKkq/r2qp1bK/2R1P1Nr/KkqRNPb1/b2PBbBB/1Q2NQ2/1BBnBnP1/Nb2RbB1",
  "knqBb3/KkbP4/BRbB1R11/n11kNqN1/rBrk4/n1qBk2B/R1Rk1RQq/pk2B3",
  "113qp1/qq2q3/qQnB4/QQN4q/qBb112N/11nKQNqr/NrNRkb2/k2k1pQ1",
  "kBKqR2K/NpBNPbN1/nnQb1Kr1/nQ2k3/1kkBnN2/qpbrN3/QQ13Qb/QN2NP2",
  "BNK21rQ/N2rbk2/rRP131/R1qpn2R/Bk41p/3PR3/BpN11b2/q1ppB21",
  "12bqpp1/kpqnnR2/pP1pKnBr/Bk1K1pq1/RnKR4/1P11N1p1/r1BNb3/brqrK3",
  "kBkkK3/qPBn11Nb/1Qkk3Q/kRB11b2/Pr1k1nN1/Q331/knQBprB1/11KkPkp1",
  "B11QqNn1/bPNBBpK1/1RRbrb2/RkQ4p/2RkQ3/BnQNkKR1/bkBbN3/1PnQP3",
  "n1kkRrqQ/2bPk3/rNnbBN1B/R1kKRbBr/Bq2B3/BnnPq3/pKrrB3/B2P2qn",
  "pkPrqRr1/rnKnB2B/11NQrP2/BnrQ4/Ppppr3/1pB3P1/1n3K2/ppBnkQn1",
  "PnkBBqqQ/1Q112br/N1QnQrR1/BKQb1q2/BNpqq3/QP4K1/P2pr3/Bq1nP3",
  "nqKkB3/brNpP2B/Kq1qKBN1/1BqQ4/B2Nqrnq/nppPNqK1/q2N1n2/npPPkq2",
  "q2kkKRN/2BqQ2r/b1Kp1qB1/B1NbK1PR/nqk32/p2qb2N/2RqNKn1/2rr4",
  "knBbk2P/1QB2Qp1/prr1p1Q1/1BR1Kpn1/q1bBpBn1/KPrqb3/p1bNPb2/BpbB4",
  "NBKrbP2/nrRQqbP1/q1rnKBk1/rpP11nR1/bB2R2K/3qbKR1/kr31n1/rRp3rK",
  "kqrrp3/kBrN4/kP11PNb1/1N1q1bQ1/pKkbnnn1/1knRnpq1/RqrnR1Kr/q1QnK3",
  "2rpQB2/k1nrRB2/rRpNPB2/R32K1/rQbrKRQN/RpKQ1p11/qPQqqnqp/bR1R1Kq1",
  "q2nr3/Pb15/nNBNK2q/P2nrNR1/n1r3kR/1qpQ4/kbB2Np1/1KKR4",
  "3pKpq1/N421/QqNknq1B/krR1k3/1Rp1kNK1/1QKKQQ1P/r1kk4/nPpPBB2",
  "B1Qk1rkB/P12p1nr/R1nNN1nk/1PpB1B1B/pqN11Nrr/1QRq1QRP/BbK1k21/N1KPPBqk",
  "RBRqKB2/BqkrnKk1/PkR212/BRBqbrp1/QNBNkqN1/1pNN4/11nnK3/KqnN4",
  "1pKr1b2/qbkPqq2/KKb5/P1rrRk2/RQqNRQ2/ppn5/Q4K11/1nQPRQQQ",
  "RPrrPn2/R1Q1kkB1/Pr2112/111Nq3/kRBk12q/NpnbbB2/Q1bqBBr1/QQ1qqBP1",
  "b2RqPp1/nPq11QP1/KKnPN3/q211Q1n/1p2rRB1/p22R2/1K2Q1kQ/QK2QR2",
  "N2Np3/bbnBb2Q/1Br131/1qQqkk2/KK2N11k/3nKQ2/Pq3kk1/1kBRbnN1",
  "KR4k1/P22K2/kB2rPNp/Q2Qnb2/QQ2PrKr/1PKnp3/qKRqQ2n/111qPRBp",
  "nkRNpQ2/11nbp3/pPnrpNkK/3k4/1QPRqP2/QbR32/qr1NqB2/QrbB2rp",
  "RpnN31/NPr1r21/NRPkqB2/rQRP4/12bR3/QRNnQr2/RbrprP2/RPp1pqR1",
  "PPNb3k/nb2P11Q/RprqBp2/rbQ1QQR1/P1Q12kN/QnpPbk2/2nQBqP1/pNrQr3",
  "Pn1R1N1K/p12kPK1/1nKQN3/Pn1rRqr1/N1q1nQp1/RRp1NN2/1rQ5/qk2P2B",
  "N21BN2/Bb1Npp2/rQ13k1/12NN1bb/bpNrPKK1/RprN4/rpqPrN2/nP1krk2",
  "111Nbr2/Pqb1pKn1/Kq1n3n/r11Qk2Q/Pk2rr2/1Nb2kn1/p111BNq1/qkP1BR2",
  "QbN5/NQKp4/KPNbNb2/b12qK1r/K1Q11k1B/RP3kp1/Q1PqKBP1/pKpN4",
  "B1KQQ3/NkpqB3/NQQNQKB1/NBkP4/kPR5/N1rq2pb/B3QK2/RNBp4",
  "bpQQK21/1PkNP3/1BPR31/qRpNNQn1/KB3NRb/Kb2qB1q/KnRBn3/k2BpkPp",
  "RnbBBqRk/NBrBKK2/Kpnrkp2/RKnQQ3/B1RbQbb1/KQRR11B1/KQqrpQQ1/BrNnn3",
  "kbqkrKq1/R1kkqPB1/22Pk1b/N1rqb1q1/B1r1Rn2/QN31k1/qKqnB1kP/NkRKp3",
  "qKbKNnp1/rK1KBkP1/brbnqBN1/kkN3Rr/Kr3P2/BPQkKQ2/Pprb31/PPqqPB2",
  "Qr3bK1/RNK2kpB/BBQ1R1R1/R1Pbqq2/pq3k1r/bkrnNb2/KBpBbP2/nQnQ4",
  "nRbRp3/3111PP/PnrqkBN1/NpkB4/11krnP2/1k11rQp1/qBp3n1/1kRrKP2",
  "PK11rPq1/KpR1Bq2/2QR1Np1/31qnB1/ppbr4/QNRqB3/Nqkk1QR1/KRRpnRq1",
  "qrnqk3/bNqB31/N1rbk2P/pNRrb1p1/r1B3r1/QpK2PnP/1qPPrKB1/BRRQP3",
  "11Brp2k/1qQr2rB/1pBN2K1/QKBK4/RqNKq3/BB1pqp1r/QNkPRp2/RQ1rpnp1",
  "1nbkR3/qQPQKQ2/2NppnBb/RNKr2qp/PQbNrPQN/1kbR3P/BpQpbNr1/r1b1nr2",
  "PQK212/kKB32/PnBRBRP1/1b4b1/1BBNR3/1PKb21B/Kk1n4/NRKp4",
  "B2B1rP1/bkrqP3/KnBQ4/Qp21n2/11bB4/kk3qQk/Rq6/kBbnBK2",
  "r1Q2krN/bKbNRn2/nKnKq3/p4qN1/R11p4/rprq4/KPn1KN2/QNpQpp2",
  "QRPPP3/12k2PP/1RRQbqR1/kB42/PNnqN3/Qbq4p/qR2q1kP/R1nrRRN1",
  "QnNpp3/NR3111/PkNrn3/rKb2R1B/RKrrPBp1/RrR2P2/rrPp1q2/KKPNNN2",
  "111BQP2/K1NQq2R/NRrr11nb/kNRqpBBb/QNKbK3/KBrKRK2/1kK1k3/qKK5",
  "qb3R2/KrP2QNp/1rBQkQ2/PqBkQknP/kBQq1K2/BNprK3/qR1RNPrp/BNBBk1b1",
  "R12RBq1/bN2nr1B/BKpK21R/21rn3/1nPrKB2/pk4nN/bqbr2Pr/KknqbNbk",
  "NPRpPNk1/nBqRRK2/1qB2bR1/R2BQpp1/qb1qBbq1/brkKPK2/PkQBp3/br32q",
  "rBQQQ3/1N1BPQ2/RN4K1/r3NbR1/q3kk2/1Bpk2nP/11K1QKP1/q1n1Q2K",
  "BK1NkQp1/Q1NnbBk1/Kk3QRP/1Kk2Q2/1Q1p1Q2/PRR11qNb/nrkQBQ2/1bnKB3",
  "QKNqp21/RnbKB3/N1r2qqn/R1nBnQ2/R1kQkBP1/nqkQnP2/NKQB4/RqKBbpp1",
  "rRk23/Q21111N/11KnkrNr/Brk2n2/Bn311N/KkBnpB2/Q1112b1/Rr2PKKp",
  "1kRkPnP1/3Kb3/q1Rk21p/1kpPnQ2/22kp2/BqP23/RQ1KqBB1/RbNBrPNK",
  "Pr6/NbbpqbK1/r11bR1Qb/Kq1k2kK/1QqQ4/RpKBbk2/kN3rp1/1r1kR3",
  "2RkRPP1/qr1KpBn1/pqn4P/rPn1k1qQ/n2rn3/1qRkn3/bb22rk/2BBQ3",
  "BPKBK3/q4rqq/qrpn21B/Kpq1b3/1nbbq3/N2P3n/1Q11BP2/qNPBnq2",
  "RKn2Bn1/Kp32R/RPnBrnk1/RrKqrp2/NknBqn2/nPRkn3/qkRPk2q/31kq1B",
  "BR3P1P/p11bk3/NqnRpn2/qbrrQn2/QRk2nQN/2RN3Q/bnnr4/BpkqkP2",
  "knnBK3/rpR1RRq1/PP2kP2/KRqrRqP1/Qb2ppn1/1RRp3p/rBn2bbB/KkR4P",
  "1rbK4/rp4r1/rNk3k1/PBbqKP2/1qkb4/1KpB1Pqr/1pq1Qq2/1B1kQ21",
  "1kN3Np/1p2kp2/KnK2rq1/r1bN1R1K/1r2qKR1/bPrPRp2/1RbPQkQ1/B1rb1QPR",
  "Kqp5/1pQnKp2/bBp2B2/Bbqr4/qBKpNRKB/P2RRnN1/RNbBbK2/QKBR1rBB",
  "Bn5R/nPpNnkB1/2bb4/NPKP4/NQP4K/nprN4/3rKN1q/Nr2Kk2",
  "Q11RpR2/qrNB2NR/qqRqkpN1/22pP2/Q3N21/r3RRP1/QPrbkr2/QqPRB21",
  "kKbkQ3/1PrpKrr1/kRknqpN1/1prK4/qPqBpK2/nNrPbPB1/QkqBnq2/1Qn23",
  "1kK1q2P/Bqnqq1N1/4RkNQ/11nRpNQ1/pPnbB3/rpk2QQ1/1nNN12Q/pqQp1bpn",
  "Bnq2R2/1QR1KN2/qpnn4/11KQKp2/Pbnn2Q1/kBb11RK1/5N2/PQrqrr2",
  "B3PB2/1KPQ2bB/31bqBQ/qPNN4/2BrRN2/Qn21q2/PR2Nr2/N2BrQ2",
  "QB1QbQR1/12pNk2/bB1pQK2/qr4Q1/rPnnpNnB/R11nB3/3q3k/1rN1112",
  "nKbqRrQ1/QnKkp3/Q1PQK11p/BNr11B2/nP11kK2/kqK5/rQkpNq2/QkNR111N",
  "qbPKBKBN/k2q31/qrpNNP1r/BpQkq3/pBn2n1q/Pk13k1/K1kRKN11/B1bBqP2",
  "11n1kKr1/PNqqB21/bQp3N1/QkK2Qr1/qKPPq2b/nrknRn2/n1bnbQ2/K11q4",
  "QPpPR3/N1qKQ3/1bBq1Nr1/bkNNBK2/nqbQr3/R1p32/Pq21k1Q/N1NKPn2",
  "1BrPkKK1/Rqnb2R1/rBNKB3/qRKrkrn1/qq1P1pK1/nqQPnqn1/PbNq3R/n1kkBK2",
  "pNrr31/QQrB4/P1kpN3/11kp2kq/Pk1NQbN1/QrpNR3/nPk31R/QPQbBrk1",
  "R11BNNN1/PPpBQr1n/p11bn1qq/Kq2KbQ1/ppBnnRKR/KkQkprR1/rQPnqkKr/rNB2BnK",
  "bRR2Q1p/qRPQB3/NrBqp12/qpQqNR2/1PNn1qN1/KpQqb3/RQQ5/Pqr3p1",
  "Bqkp3r/R1b4b/nbRRrbK1/1K1BBN2/RPpq1bk1/Kn2q2n/pkQQQk2/2K1rB2",
  "kPpRQ3/1KP1PRrb/rNNRQ3/1PQBp2k/n21Kk2/NppK4/qp1rpqq1/k7",
  "PQBP2p1/kk5R/Pp11prrN/1Pq1p12/1QRPpKbn/3Kk3/QnQPR11N/PNQqBK2",
  "1KnQ11B1/BrrkQRpp/bRkNNk2/rKP5/qkqQ21b/nPqNrr2/rBQPRNN1/bRKpqkqr",
  "12RB12/qknP4/211bn2/pRpbB3/NPBPpn2/rBnk4/NnbB4/nr1P1Kqk",
  "KpKKPrpb/KpBb12k/r4Rqq/pPkqrNPq/RK212N/PkNkpkk1/1Pb1KPq1/11PPKQ2",
  "rQbPrBr1/rkrr4/1b1r11P1/QBqPrk2/bKRkB3/Q21bN2/K2bnq2/kqNKrR2",
  "k21PR2/qPk22P/kpPBBB11/RNkBNP2/rp1NkP2/kP1nk1R1/rKNp4/1nPNkB1q",
  "k11qQb2/B1qPqQb1/P11NkkNK/RBPnk21/NqqpBp2/nqNpr1bR/p1Bp4/PBRKBkb1",
  "2qrq3/qQ3Pk1/nQ11qnr1/1PpK4/nnrrN3/Q1b11qrQ/rnbnP3/Qq3Bk1",
  "1k2knRq/RbpKQ11N/QbqNqp2/QpqpQ3/NqBn2K1/Q1qbBK2/bBQ5/npP2n1P",
  "KkqnRb2/3QNBn1/rKPQ31/2nRB3/qN11Bk1n/21K2rk/1qB11nRN/KBPP2q1",
  "kqbQQ1k1/rQQ3Q1/pbrkq3/PQ1pQb2/qk1PbR2/p2KNbN1/RBn3n1/pnR41",
  "BQrn2Q1/1QRQ3b/RQB1RnN1/11qN2rN/rr1QNkN1/1rPkRBK1/N1n2b1K/KnRkr3",
  "nRk2N2/KQkbkpP1/11bN11PB/BrQR1k2/bk2BNPr/N2NQKB1/QqBRr2b/1nnk4",
  "KBrRR3/1kkbPPb1/Rb5r/1Q1Bp2b/NkNpp2p/RrNPPK2/rrbBnN2/qBRnKn11",
  "BrNnbqk1/ppB2B2/Rb2rpR1/11Qq31/QQrqQ1Qp/NN1PnNk1/11nR21p/QRpQrK2",
  "1r3qnQ/KB1bBk2/n1BQN1R1/qPKp3n/3pppn1/1rqrbR11/qKpn13/Qp2pnn1",
  "n1RkBK2/nqNBRqK1/kp3NN1/nBkkn2Q/RRQpq3/N21qrb1/bnbNrP2/PNBkRRb1",
  "knqKR11p/nNrPN3/11QKn1Pp/RPRR3q/nrbkRrP1/1Bbk4/bQR1bqRk/rk11nr2",
  "1PNR3k/R1BQQKp1/Prbqknb1/1BBnbpK1/NrpBB3/rQbnnb2/QkkRK3/nqrQbp1B",
  "NQn3B1/KNQrpr2/1bn1Pn2/1Q1kkPNN/QRkqRB2/n2pkrBP/K1kkPq2/N2QkQpn",
  "pRR5/rbBrNKP1/1nBRR3/pNb1P1NQ/PKKbb1b1/2RqQnb1/qNr2K11/k1KQBR2",
  "RbQrQNq1/1N2QrB1/1Pn31p/RbpNk3/rKqRqR2/BqNkQB2/NQ1rK3/K1bRn1P1",
  "QQ4Rn/rkpkK3/rrPqRr2/pN1RRB2/Rp2QKqN/bQp21B1/1k111RKB/121rRN1",
  "q3r2p/kRQP2K1/11p1pnk1/PQr21P1/b1nr1qpb/RbrRkp2/NNK41/RP1rnr2",
  "Nn1pKr2/k2KPb2/pqrbPbp1/q1NnQnb1/PBN41/NpkB3N/bkprbn2/3N22",
  "BQpb2q1/1BrRnn2/3NQkB1/N1N2BB1/KnKrRrb1/RP1NP21/NQ2b1N1/b24B",
  "1bnKBbb1/R11PRnrr/KRbR4/BBnk3R/R31knR/1rNK1Kn1/KBQnK3/rBKBNk2",
  "1P1KNnBP/rK1Rk2Q/RP3Q11/1QBb1pp1/pB2NQkQ/P2KKP2/kBR1P1rn/PrRQNr2",
  "8/8/8/8/8/8/8/7",
  "rrB311/pKQRbkQ1/QkNpK3/p2N2Q1/Rbrnn2q/Bn3bN1/n2n1kN1/1n11nk2",
  "1kPP31/RnBRq1N1/R511/3kP1B1/NBnkq21/PqPr4/R1Qk2qr/b1N21pp",
  "krr3B1/1P1KbQNB/P1pB4/rBPpq1RR/1ppPKNP1/22NBq1/RKqr211/1rbQQq2",
  "QRp1PqnP/bBrkQN2/pQ1QRQ2/Qq2n12/bpkbBp2/1PrKpP2/nNbBKQk1/NRPk22",
  "kppPbKPK/pp1BnKQ1/PPP1BRn1/RkB11RnQ/PkNRPP2/bnKpNB2/1R1qb1R1/krQNkPP1",
  "112BnQ1/3R1kq1/N2QqQp1/211bkK1/qNn5/qnrPPB2/2kRk2R/q1P1BrkP",
  "qRNNB3/nRqkPb2/r22KK1/NrB2nk1/rnkb4/BRqkP3/rRkB4/N1k1kn2",
  "q1N1K1B1/QnnB4/1nPbpr2/NB3k2/NNkPq3/NBNrqRp1/PkN1kkB1/b13nnK",
  "Rqkq4/21NRPq1/1PQRB3/BKQpbp2/2b1rkq1/rQKn3Q/Qqb21k1/1KPrK3",
  "pkK2bQK/QBQBNn2/bnR4n/1QnrR3/1brNkn2/1qPrRBk1/k31qk1/nQ1QQ3",
  "krKb2N1/K1Rnn1Q1/1b1q3K/1Prp21p/Kqk2r1Q/111kNp1b/qnqbr3/kQnPBK2",
  "qQ4B1/2NqKk1P/QBnN4/pBbpRpB1/Pq1n112/BqPb4/rkn211Q/RNq11BN1",
  "Pp1R22/K1rQKBp1/2qBn1n1/n2KNPrb/b1PbQkn1/N1pQqr1B/q1PPrP2/1QRBkKRP",
  "BnnqRr2/Q1pq4/1KbRQ1r1/P2pPNk1/k41rq/npnQ2Kb/B1b2PRr/Nb1qQ1R1",
  "N1KRRNbq/bBBNBQN1/QBR1R1r1/bPP41/RQBKKPp1/K21Pk2/bPN41/rq2R2p",
  "1QqQ1Q2/BqPKKQ2/QBRq4/n1nBBK2/1nkbNn11/rrpNP3/K6K/nBN11qp1",
  "QBQbkrP1/RNQNKpPp/B1R4r/Q22q2/K2rBp11/R21111R/rQq1Pn2/P32n1",
  "PbrQ1r2/QnqnR3/pBb2BQ1/bbKR4/rRKpQ3/kR1RRQ2/n4NnN/Kpq21b1",
  "QBNrBR2/QqBRR3/N1rB2R1/p1k2Kq1/NpPBq21/1NKbp12/PrRkR3/1PK32",
  "13pqp1/1rqR3k/pNRq3P/nn1PRR2/RrRk2q1/RnQKbn2/NRqrQKrK/nBB1qk1r",
  "bnRkKRNk/r2RQ3/PppBbR2/11Rpbp2/Nbn11pr1/Q1nQ3K/r3Nrkq/r1nNnkn1",
  "1p1bkBRQ/nK1r1KbR/Kn6/1KN1PRP1/b1rn1PNK/qNkR4/bKrrnn2/Rk1nPnb1",
  "qnnqKRK1/KrpPNPN1/pBbkPRP1/Bp1q1qr1/nrNrPRn1/RNk12Bn/12pppk1/q3k2k",
  "1kPP4/1B1k2K1/2r1p1RB/1r2RR1N/br2pB2/bnbBN1pb/PPN41/1rbNNKQ1",
  "kRRnrN2/Pn2N21/31n3/1QK31p/NQnQK3/BKkQBb2/r2Pp2Q/B1N1rR2",
  "kqN5/PKP2QR1/rrN2q2/N1NppPQQ/QBqpnBN1/PqkPKrN1/qkk111QR/r12KPQK",
  "Rrrkk1b1/qPpk3r/PQNKqrP1/qqnqr3/KbrP4/prpnqKQ1/qQKr4/BBq21r1",
  "1rpRp3/qbqn21K/p1Q1Pp2/Q1kQNPp1/ppkp21r/npNqBrBn/NKqkPqR1/2n4p",
  "Rbrk4/nQN5/QkbbB3/pBNb112/Q4Kn1/KpbkQr2/NRnnBP2/r1Kr31",
  "2BNQq2/krNnBqN1/nPRnRR2/Np311B/QPrNQ3/2n4k/qNknP2N/BRPn31",
  "b31qQ1/2pB4/kk2NpB1/R1Rk2rb/Kk2qKK1/PP2PN2/1NnKQR2/2Qqkqr1",
  "PPBB11pp/121121/QQpP3q/3bQnnb/rRPqnb2/pRN2bPn/112P2P/k1RPn3",
  "KBRNB3/NP2KP2/p211q2/11n1RK11/KnpKRn2/k1NrNp2/nbbBNNr1/QRqRqBQ1",
  "bBq41/P1R1rqNp/3P31/KP1PNBb1/B1b1R11R/QNkP1Bb1/pnQr4/kKqkKr2",
  "pb411/RPb2rPk/1qp11nB1/1RQB1nB1/QRq5/rpr1K3/N1kQ31/k2Qqr2",
  "kQqqQkN1/bQKnpN2/rqpbknb1/bBRk1P11/Rknr3Q/qnnQ31/1RNb2b1/1nBRKb2",
  "1QnR31/211nbp1/NrQNQ3/RqkrrQq1/1kkQP2r/KqKK1bb1/NRrq1bBQ/N11p1nbr",
  "Rb2RR2/BkP1Kk1B/pkrkrR2/rrkPR3/rRkKKK2/KKQ1rB2/QKrR1rNr/PP3K2",
  "RpBPR3/BrPQq3/bQknB3/p11b1rkb/bBB5/K2BP1N1/rpK41/11N1bQ2",
  "1Qqb1nQ1/nrPQR3/PBK4P/kqp1RKR1/K1p2Nbp/b1pPP2Q/bR111QnQ/k3B3",
  "kkP1KpR1/41pQ1/qpNK11b1/PRQ3Nk/q21qKP1/11NrN1Q1/1rK2k2/qBKBQb2",
  "NPkrRp2/1QB3bk/QpbPnB2/QnKQkNP1/NqqPqRN1/Q2qrP2/rPnnk3/NNR112B",
  "KPr41/12B21N/11Pnp21/BQRp2n1/pbrKqQbP/p3rP2/1rQp4/pPPbN3",
  "k1KPnPK1/bBPQB3/Pb12r2/1kNq2qQ/Krp2R11/nRbqnqp1/qq3B2/P42R",
  "PK51/pbNqk1nq/1p1nqbR1/b4N1k/NPNnbN1R/PB1P3q/1k1NBKNN/nqnKKq2",
  "krkq2qq/R2RB1qB/21RpP1Q/NQrRrp2/2BqnBR1/PQ2PbK1/RPk2pB1/RRB2PPk",
  "qbK5/nqqPN3/PKpkb3/Bbk1bq2/RN1KbK11/RRq5/1K1PR3/112pR11",
  "NnB1rKq1/pnRK1Bn1/111QbRKn/nKp1b1n1/b2PpbQ1/kPNbRbp1/rpK2n2/11pBK2r",
  "QqrpB3/1Bnbbb2/bPBpKq2/NqrK4/KrpkbPq1/k1R21r1/bPQB4/B2kPK2",
  "rpp3b1/KkNPpp2/nQN41/PkKkbqPq/3Pr12/NqRk1nr1/1q22KP/1nB12Nr",
  "bNRRB3/NrqKP3/kK2QQ11/1k1R1RK1/1rBn4/BB1PNp2/qBb1KN1R/1q1Knb2",
  "8/8/8/8/8/8/8",
  "kb2bb2/kR1pQ3/QBkbp3/1k111qn1/qrNq2P1/12nnq1b/PNq21k1/qkBP1bbb",
  "nnqkK12/1k1rN1Pr/2bnQBN1/KQkpP3/BnKkN21/N2kRKK1/KNK22B/11Nn3n",
  "qp3qp1/Rpq2q2/PKQrNBr1/Nrp1P1P1/rB2qNQ1/qnkKN3/11QqrK2/qk6",
  "2qknKR1/nRkqN3/PbkQQ3/n1Rr4/Q1NBk1R1/1RB2K2/RB1PkQBb/bnPBb3",
  "NQPKq3/kKrkN3/rQ1Bq3/RRqkpB2/BRnQPBn1/PbPQNQ11/Qqrbq1QP/PBPQ2KP",
  "Kn1KK1Bq/B1NKq3/qK12Qkp/kPBkb1kP/N2nrp2/RQ2RN2/KK2kqqP/NNnrrN2",
  "pQr5/RQnRPqKQ/b2pp1k1/bKBRP3/K21B1N1/4kp2/BQppq3/P1BbP3",
  "BKNkRq2/kPBP3K/Rbpnq3/2qrn3/pqpkb3/kPQQBp2/kqQNq3/rkRkRpKb",
  "n1bnP1p1/PnBnq3/QknRn1N1/nRkpNk2/Pr3p2/rBQB4/Q1Br4/QkR2q2",
  "B2knrk1/K2KQ3/b1qBQQ2/nr3rQ1/QQRPP3/KnNBb111/P221N1/bN3qq1",
  "PP3qq1/R2bQ3/P1P1p1r1/NKpQ4/Q2nQ3/1k3n2/nNkbKpn1/qQk21b1",
  "n1rqB3/K1qn4/11BqQQ2/prPBK3/Pp1k1b2/qB2prn1/nkKpRNb1/bkNp2b1",
  "nKqrNN2/K11RrK2/n1BnBn2/Kp3p1B/1QpqRNK1/NP1K21Q/NBP21R1/qQ12Rk1",
  "1KnQbr2/RrNQN3/rPN4k/KpnB4/12rBk2/BQ3Kn1/kQ2kqn1/PKnnp3",
  "1q3K1P/rPKn2pp/Pr1ppQQp/1prQrnQN/B12bkqb/b1rbkp2/B2PR1q1/kNb1Q1R1",
  "RBB2pPp/krkk4/Kr42/qNKbrk2/Qp2KrK1/BrR2n2/1r2nQp1/nbNk1KRr",
  "bk12nQ1/Nk1nbpR1/KBQbkb1N/nBprKbB1/11BNKBP1/2krbk2/1RRnn3/nRRRB3",
  "PNRb11n1/2Q2KQp/1KNq4/N1BNbN2/12KbKn1/1kRbN2P/rkR2Kr1/p2nQr2",
  "1RB1Qb2/2BpkNk1/prb3K1/kpkpQ3/NBKn4/1N1KPp2/PKQBrk2/KrNr2b1",
  "r21bNr1/NN1rBpB1/RNkqbR2/NBprqQ2/rn22q1/QPP5/kKnbqK2/bK1Q211",
  "Rk21BKN/p4n2/N1QB1Q2/bprpp2k/1QRKKRR1/NnqBbkp1/qqN5/rBnppQ2",
  "PrnN4/Kpbp2q1/KkPB2nr/KNPbrk2/NbBp4/b2R1kNn/1PpNpn2/NkKKBq2",
  "ppRkNQ2/1rQ3Q1/rrPNpk2/kBrpP3/bpB31r/kKkP3p/1kknkppn/BRk11K2",
  "nPqpBQP1/pBnB21r/1BbR2p1/111rqQR1/q11Pr2r/NBn11pB1/B1kQRP1p/Bnpk4",
  "QQ1kqP2/1NQ1kBP1/1k1n1bPq/bpNNB3/Rp1bNrbN/qNRBq3/p2bKBNq/Kq2Kp1b",
  "K2q1BP1/pBKq1bpR/3P1bQ1/RPpRqb2/knQn11K1/rkBRnrB1/3p1PR1/BBbrk3",
  "KkQbQ3/NBkBrB11/1P2NB2/nKNpn1r1/q2RN3/N4B2/1nbr4/NqN211R",
  "NrB2brQ/qRN32/1k3Q2/PNK11prn/QqqqBqqB/RKN3r1/B2kK21/Q2rQnr1",
  "NqkqkPP1/kR1rpbp1/kqb32/rq21QKQ/PRBp11Qp/251/1kBqBN2/Rr21NbQ",
  "1qQ2pB1/KPP1R1qP/NrkK4/1b2pQ2/n2qNrKR/PN1RbNqP/kRB1NrP1/nn2knnb",
  "NrQQ3b/nPKRPP2/bQp5/rpb31q/rb1KBPnp/R3k11Q/nprrQQkp/RqbQn1rN",
  "rQPqbrP1/bpPQkP2/RpP11B2/1qqrb3/K1Q11PP1/BqRnr3/nN11N1Q1/Qp2n3",
  "pPkk31/bnN111k1/KN2KrB1/r2prBN1/RRn3q1/1kB112N/rqRqRn2/KbRRnR2",
  "1Qrp2K1/1kqkbP2/b1b1pnQ1/nPRrBNk1/11RqbQqn/NB11PkR1/NNrkBp2/NBRb31",
  "b3bb2/rQPkpnK1/bBk41/rB4kK/KRK11qbR/kPnpKn2/BKKBn3/Q2Bp1KR",
  "rpRQ2Kr/2Rn4/BKPNR3/1NqKkbb1/1qrr1k2/bRKN3P/pR32b/B1qk31",
  "KKBqRK2/kbr1BKqP/nB11qb1p/kk4NR/QbBb4/n3Kk2/RPBqNrQ1/B1N2ppn",
  "4KB2/RKpNNr2/1bRkbB2/NNNRKB2/nn1B4/qBQkKRB1/bRnqKn2/BP3Kkp",
  "1Q3kbR/1RnPNn2/rK2RQ2/QbRn2Q1/KQkq31/rP2Kn2/pRPpk3/bqk4B",
  "bN211Q1/1rBnKQk1/pN3k2/KpbNQq2/QqnnrQ2/RQQrb3/qQpQNB2/bR1BRP2",
  "nqNQRbp1/1Krrp3/N31nb1/1qK2PnR/q1pRbK2/bPBP2kn/QrRb2BR/PPNbRB2",
  "QQpbrR2/B3k3/bnPRbq2/knN3K1/KRpnkp2/PBrkN3/pKqK22/nKnnNnk1",
  "1Q2pn1r/p1pPq21/rKRRB3/1bRbkN11/1K1Qqq1k/kKNk3Q/k11P2q1/1Nqkp3",
  "qq1PpB11/pNpP1B2/RRrQpK2/QRBkBpr1/NkRpQ3/nNQR4/Kqr211k/NQbBK3",
  "2NKnb2/QPnN4/nKkk4/K1k1nkk1/bBN2BB1/bq2bnBp/P32Qq/Nn3pp1",
  "kpn32/Prk1Bq11/R31Np1/1N1QBNKN/bq1K1KPn/rnP2kPk/KBNq4/Npq2rR1",
  "k41nn/npkqP3/1B51/rB1KkR2/R11bNQq1/q2QNq2/BRRpQk2/N21pPN1",
  "Qk1P2RR/BPkpq3/QNPQ4/2B1PQBP/NNQp11RR/pKbkN3/nqBR4/1BkK1Q1n",
  "1NNrbPp1/2RnK3/RNk41/PPRN1P2/N2PNBn1/2R1Rn2/rb2NrKp/NrP2q2",
  "rRPN3Q/kQb2BPr/B13Nk1/QNRKQ3/2pNNq2/Rb1Qn3/pnbnQ3/q13bn1",
  "1Qp1qBK1/11qqr3/NRRQRk2/K2QNKB1/bNKBpb2/QQp41/rnRnkbQ1/KqNnRQP1",
  "NKK1bn2/QrrPRkrr/nBbNRb2/p3qPP1/NPNQ3N/1PbQ4/4RRB1/qP132",
  "3k11bN/2r4r/N11RQ1bq/rQkqBr2/NpqQ2rr/PpKBp3/R1pK31/NrqrP2b",
  "Bn2bnkp/p12bKq1/Nkn1KP2/1N2qQ2/BrpRKqqk/kPb1nK1Q/R2bqPK1/13kQN1",
  "b3QkQr/PBKk1p1b/1Pkq21B/Q1PbrBk1/N21NNQ1/1P2NRR1/1pBkR3/nRBK4",
  "Qbbk4/nBp1rb2/BQp3p1/PkRbKk11/Kb2kn2/bRnBR3/QNrQpPKN/KQNnqn2",
  "k11Q2k1/1pQ5/2BB2pR/rQKQqNN1/BN2nn1p/PKrqP3/bKQ5/1Pk2K2",
  "NbR1QRb1/qqRQnp2/3pP1B1/Rk4n1/2rBN3/nnnbQbP1/RBbRB3/RrpNqPPK",
  "pP2RnRQ/r2BnR2/rb1nkN2/RbBNp12/Bp1NbPP1/RN1kKqN1/pbrR1pQ1/RR2RN2",
  "knB4B/1b1np3/pp1kpnKN/PqbPR3/KQkKBnR1/BR1Qr3/rQk31k/RKQQqPr1",
  "2brbrn1/nKP2rK1/R1pP1Q1P/nP12Pp1/2q3rq/1qN4Q/B21N11R/12pknPR",
  "KkbqR3/Nqnp2BN/NP1b1RbN/n31NR1/PpQ11NR1/NRnR31/qrqnqpB1/BkbBrB2",
  "k2K2N1/nBnqrk2/qpRkrBk1/2pN1111/11pKpp2/ppRrnP2/K2rBKb1/q1pnrp2",
  "nB1BnBNn/1N1qQ3/kRQ1qBp1/KKpQP3/B2kNp2/rbQ1bQQB/qrnPnbQ1/R1qKPNBk",
  "bqRqR21/rPKnnBN1/b1npq2B/Nn2rNk1/np1qQKQ1/1p2rQ2/kkrBn3/PQ1BBK2",
  "1nQbNrp1/pPn3RK/BbnK1KPR/PQB11N1p/NpKNB3/2Rp4/BBrRBqBK/KQ3pr1",
  "BQP1Q3/Nr1B2n1/kQPqk3/BkrK4/B1Bqrrb1/Q2bbQp1/Br1PR3/q1PKqQ11",
  "n1br1Nn1/Knpqqn2/b5kr/RNp22b/NP12b1Q/KbBbRNp1/NPn2b2/1qQ11qB1",
  "1rp3rK/RrK5/1RNRQk2/1NnbN3/q1q1qnQb/pkrnRKQ1/QKKRnrP1/p1111B2",
  "N11kqK2/QqnRpR2/PbRKqk2/q1NRB1q1/1BnPqQ2/qnQPbPn1/1Q2R2B/Ppr2Rbq",
  "1B2K11p/BrPNkP2/R2bRkp1/nNr5/p3Q3/1Prn4/1QR1QqKQ/P1k2R2",
  "KBbBkBNK/b2Rr1b1/Nkqpb3/pqBr4/Bk24/PP1qr2Q/K3p3/Npk12R1",
  "rPpQR21/1BBKQQ2/qbkK2Kp/qbKp22/1Brn4/KQpP3n/pQ2b3/b1kPKk2",
  "p1K1NQ2/3qkK2/PQ2BQQ1/QkqKqk2/1pnp1pn1/RQ31Q1/Q11n1Rp1/Kpqb1pBb",
  "pbb5/qPRBb3/RnPRqN2/pQbnqB2/K2Rqb2/KrNB4/qPP2p1Q/nR2NN2",
  "krQkb3/11Nbk3/K1qpkk2/knQR2p1/QprqNq2/r1rk1RQ1/QRKnb3/1b21R1q",
  "KKnb4/N1NnKk2/Rbk1bqNr/qPPQ2nR/p3Bqr1/n11kN3/bkQ4b/kQk212",
  "13Kr2/qrK11pbR/RNnN22/N21rKbk/pNNQprN1/KBqKrk2/p1RPbKn1/K2KPP2",
  "2Nk1p2/rP211pr/nK1p4/2rRBpb1/rNR1rNkq/1r1rpBK1/nr6/n1nrBRPN",
  "1Rkpk3/bbPrpb2/kpQnNk11/11RN3K/knqnKkq1/RNkrP2p/Q2BnR2/pPRk4",
  "1P2r1Kk/RnpPQ3/rpqQbB2/NnbRn3/pPnrrk1p/qr1pB2k/nKRRRPQ1/KKnQN3",
  "nKnp21b/1p1K1nN1/1QpBrRKq/BKPrnp2/K2nqBp1/1Rk2R2/knnpNRB1/RQPp4",
  "KNPk4/prbK2RQ/1QQqq3/kkQbN2k/nBb1kPbN/NqqkrbQ1/1Rpknnr1/bkpqQR1N",
  "PBQb1rkP/RK4bQ/BkbKR2b/q2KrBb1/KQnB4/1rQBq1N1/1RPQrKn1/1K2q2r",
  "1b321/N1rqp3/NRn11QkK/1NnRNPN1/1bBqNQ2/KnQB4/BR3R1Q/bPQBrRq1",
  "1qPKN3/BK2Kkrk/bbrPkBB1/QpPpq3/kRpb3k/NKbQ4/QpnrQn2/QqqKkn2",
  "1NpqNNPN/bKP11P1P/k2rR111/K1pkKRkP/n2NR3/qbPPk3/bPBK1nq1/QqqQ3k",
  "2B1BQ2/Kr3Rr1/QRnK4/R2NKqN1/r121BQ1/3qq21/k1P2Rb1/PqKrqpP1",
  "1RKRN3/qBBpK3/pNnN4/rN4R1/1NP2Qb1/Br3n2/pBKkBP2/RqKN4",
  "pP11N1rk/rkRpn3/1P1QpPR1/qrNrbk11/rRNbN3/KNp5/1P31bB/Q2rpnQ1",
  "BR12Knr/KKrnKn1b/NKK1Qb2/rp2BQr1/R1RnRr2/bb1qKB11/bNnbBP2/bR21P11",
  "Qq1q11P1/q22bR1/PKK5/2nq3B/P1pprBN1/1rnRb21/kN1nNN1k/1qnppN11",
  "NK1qpQB1/KrKqRnq1/1BNNbr2/QPnqr3/23k2/1b21rBP/qbRNNN2/1QPKQNK1",
  "bbKn211/1bRr4/qPpkkQK1/BqbQ2QR/1kq1pnnp/BPRRqn2/1R111Nb1/1kPqkQ2",
  "Np1nk111/BQkpqQ2/N11ppnK1/Nrbk2Q1/QRRQbb2/1qqnRq2/1Q2kkBb/RpRRNq2",
  "qbpbkQK1/2BpkQk1/kbbBr3/p1k1krpK/K1bKNpB1/QkRp4/PRK5/q11RQb2",
  "bRP1rN2/QQp5/nrK3BN/Kp4R1/np1nkqq1/Pn3Q2/2q41/QQ111nRr",
  "Pn2Bk2/kPqk3P/rPQB2k1/qqPknNb1/r1bRP1Pq/b3b21/RqnRbpP1/RBQRnnbB",
  "rKNn31/2qR31/2BQQk2/kpbnpR1R/rnnNbn2/RRPKp3/KrbrR3/qN6",
  "qk3Q2/bbPn4/P2b31/NR1BbpQ1/PKqKBQ2/nBnBbKP1/RkrQNpP1/K22BR1",
  "R1Bn4/1krBKNN1/nNQ1r2q/bqNrr3/1NQPNN2/nrNp4/NK1KkQrp/k2KPp11",
  "b1QNnBr1/1Rqk4/1nP3k1/RNp1PpN1/QB3q11/P1n2RK1/NNnRNbk1/qp2pBp1",
  "NbK1PPnq/BnBBqk2/bP1R2rb/br1k2kP/KkR2np1/PQNnNKNn/1pKpkB2/1KnqQbrP",
  "2NPRr2/Bn2R3/q2k2Nq/rrP11N11/PRkQ1p2/nKKq4/bNB2br1/KkbKpn2",
  "pBrP4/NBNBQ21/N511/2rq1QB1/N1NPRK2/N1NQBNRk/Kb22r1/Rp1R4",
  "rNbkbRQ1/qQn2N11/KPbNk3/NqqN1Q2/3NBBN1/k1qB112/1q1PnK1r/nNb2K1B",
  "Qrkkrqr1/Brkqb21/Bkkbkk2/QKRpK3/NQ3bN1/1p1pNPQK/b1RPNB2/PNpK2n1",
  "Q1b11Qnr/2Bnn3/Nr11rnkb/B15P/pkQKrq2/b11k1k1B/Qpbk211/nkp32",
  "nP1kRrk1/kQQBKRp1/RKkkP2n/qRBpBNQn/q1r1rrb1/R1BN211/pkbQRpK1/qqrKqrq1",
  "k1bRrnN1/Nn3nNN/QrpqRk2/4PKQP/BrpQ4/BKp2Br1/11q1pN2/BRQpb1Rb",
  "111qRq1n/PBkq22/K1kKQ3/rn1k1Krn/RQn11NQ1/B21KkPK/BbqnnkBq/qrqQ2B1",
  "kqRNB3/nPp5/13PP11/Nb3p2/qQRBnPQB/QqK4P/kBRr4/b2N1Rn1",
  "kqBqK3/BqRQ22/QrnRqK11/nrk21r1/1K1R21N/11KPqK2/Bn11PrPp/1QbRr3",
  "8/8/8/8/8/8/8/",
  "b2q1nn1/qb1NqQqb/1Q33/npBbB3/Rb6/21Pq3/RK2p21/kpbNnQr1",
  "bNnkrqK1/BpQr4/RKPr1qnQ/B111KB1k/bKprRB2/kr3n2/Kqq3kN/Nrr2R1b",
  "PqnNb3/Rpnb3K/bn1Nb3/nKR5/1NkPknR1/k1111QB1/qQNR4/bb1q211",
  "RKBkqQ2/rKnPp3/1rkbRkrn/Prrb2P1/1kRk21N/1qN111B1/bPBqb111/KKrBb1qB",
  "1QbPKP2/pKnprN2/rpK2p1k/bR1qnP2/R1NN1kK1/11Nrq1Bq/pRBnN3/KRrbKP1p",
  "Q1PKkb2/nQPkb3/1bNBN3/PBkb1pB1/1Q31n1/p1QPrQ2/rrN5/12b1b1p",
  "k1qBB1b1/PpbbBBP1/N31n2/bnN2qPN/nBPKQRRP/K1PbkppP/kqrnr3/BnQqnQ2",
  "Q2Nbr2/qn1nRp2/kBk1PKN1/nN1k1Pn1/rknnBr2/bPpN31/PrqpRk11/Rqpkqpn1",
  "n1Pqb3/1bPNN3/1kqkrNB1/nNppR3/bNRNBr2/112pbR1/qpk1Q3/12pnNB1",
  "KPPk4/nRrb1p1K/npBKK3/pq1nPKQ1/BnRnk2R/b1QNpBbp/QqPRKPR1/RnP1QqP1",
  "111RPPP1/rQ1B1q2/nnbQPNQ1/1QbPbp1B/11Npbp2/R1N1bbp1/P2kBKbK/qPbbnK2",
  "n31Q2/PrQbBB2/b11KpR11/Qn1pPnb1/rpqrbk2/1q1kk3/1KpBKqp1/bKpqK3",
  "n2qq21/PnnQ2kP/K1NkkN2/p1q5/n1nRqQ2/NNpNkBN1/1bBK4/N22bRq",
  "1bqBn1RQ/11QR111b/n1Pp2qp/1NNbP1N1/p2kkq2/rqPbRqk1/kB1pQrq1/1ppQ4",
  "r1r2BB1/nBqRR2q/1pQkp2B/qPNR4/1BKqKR2/Pq1QkP2/bkK2Q2/Bq11RPkB",
  "kB3BbK/qqRkqbNp/QrRRbR2/rB2Kp2/1ppRN21/KNRbr3/PnkB2br/kK1pnnPN",
  "BkpqkQk1/rbrN31/kq1r1KKp/R1QQ12p/1bqpNNkP/kNkrBn2/1qKQbN11/RNpqNNP1",
  "1RnBQpr1/QkRqPqPN/pnppb3/p2QKKrP/rr1rqrQ1/1qNQQb2/RQkNRr2/1111p1b1",
  "2KNNRp1/B22bk1/NRBBkrqB/rPPq31/nQq2bKR/KkRQnR2/2PBRp2/NbQKkpb1",
  "rnbqkbnr/pppppppp/8/8/8/8/PPXPPPPP/RNBQKBNR",
  "n1PbBkP1/QkR31n/1nr4b/rprq4/rRkqKQp1/pqK1kb2/q133/prKK4",
  "n1nnq2r/qR21BR1/RNNb1111/nBPQRP2/PqpPb3/R2p1k1k/1Pbpr1rb/pQN41",
  "rQpR4/q4K11/N1Q21kP/PqqQb2K/rP3K11/Pkk5/pknBK3/Pq2br2",
  "1QrN1BBB/BpQ311/P1Q1Nk1P/NBPQN3/1bn21N1/Nqb3rr/1qp5/k1rR1qn1",
  "qrNPB3/p1nrkR2/KRNKkb2/rKRPb2p/1BNrqnqN/q2k11PK/n2rkNp1/RRppR3",
  "n21KRqk/1QRrbpk1/bNnqn1nR/1rPRQ3/QbR4k/PRqqK21/KkKQR3/nB3Kb1",
  "kb2b2K/NrbRBnq1/BpKNPnP1/RbnNb3/k11Kr3/r1rQpP2/1BQpkr2/P1Npnnk1",
  "nqqp31/1q3QN1/kKk2QQ1/nbqQrBq1/1RP21b1/Rb311b/nR3P11/npPNNP2",
  "B1pRRKR1/NnkbPqk1/pK3rN1/kpQQpQ2/KqnqKb2/KBbNqq2/1pkr1nP1/2pPN2b",
  "kpNp4/RQKKnq11/p1rpPQpP/RqbnnQ2/rRRPk3/1NQkQR2/brPbnk2/kR1Bk3",
  "qKPN2bb/N1NB22/1k1n4/p1NBQkp1/KnQNKp2/qR3rbb/Rb1PPr2/2BrnRb1",
  "BkQKNQB1/BBPn3Q/1rpq4/11Pb2r1/rnNK1BqK/PBkR3N/rpQ4Q/2nNqrbk",
  "qbPqpQK1/121nP1K/1kkr2p1/r1rRbbqP/bK3KN1/12qpQqb/bnK4N/Q3pnN1",
  "1N2kR11/1QKB4/qbQBr3/1pNPB21/RR11KrB1/b1krR3/1qNBQb11/PrQpkb2",
  "pQBBKB2/R111qkB1/RB2rP2/p1PBNn2/k21qpnN/q11B1KQ1/qKKrkn2/Nkq5",
  "RBKk4/Rq31NQ/nn2bR2/QNnq31/rb3r2/1ppbBRk1/1KbqQ1R1/RqrQNp2",
  "qrbr4/kK3K1Q/nQq41/Pb2RB2/1PN1kqp1/k211QK1/n2bKBQ1/kkkk1r2",
  "13PQbQ/bR2NP2/PknkK1k1/B112Bb1/BkK1PQ2/N2RK2P/pQbB4/pp1PQnN1",
  "k7/8/8/8/8/8/8/8/8",
  "bkN1BQQb/bNQBn21/21KBb2/b1KBKKKq/2nrKQ2/BQKBB1pk/rBB11N2/1R1npR2",
  "1bnbr1B1/n2BP3/1K1kppQr/bpr2kP1/q2pb1pk/rkkk1Br1/nKBN4/qbRPPkn1",
  "1bNK3P/1k312/QpK1Rb2/bnrpKQqQ/BpNrP3/p2n1kk1/kQp5/bBN1BB11",
  "rbPPKQr1/q1kRr2b/nP1P1Pb1/QNPK4/1bRrP3/k211R1P/2QKP3/RbPKb3",
  "RPnq112/kNQQ4/1rN3Br/1qnqQq2/kkkQRn2/BP2PPb1/PN3Kpr/B2Qp2R",
  "1Kb1RQB1/q3KQ2/qkqBQ3/pkknkP2/KpkQQnqP/2Bnknp1/Nb31K1/RKQQR2q",
  "nrrNNQK1/1qqPRpbR/pqrq4/nrNPB3/qkRRQ3/2RQNb2/k2K2p1/kN4Kr",
  "NKB3Qn/Rpn1n111/Qkq4N/RQpQpn2/qNPRnb2/n2N4/pbNbk3/pPNbPN2",
  "BQNK1Rp1/bpNkPR2/bbB2n11/PpkP2nk/RnkKKPn1/q2kbpRB/pkkkbkQ1/pnBkBbP1",
  "R1Rn2rQ/PP4r1/11kQkkk1/pR1P22/qq2kR2/Qb3Q1P/b2k1rQn/B1NPqQk1",
  "p1qqpQ2/pqrKnk2/nkKrq1rb/Q1Q1nKq1/bNRBb3/pB21R2/qR6/qnBqB3",
  "BKqp21n/PP3N11/PqNqr111/1BnbkqQ1/nqBQpnN1/B11Q2QP/1NKKkr2/1b1nK12",
  "1KrqBnrN/pPPq1qkK/Q1k1qR2/1kKNpKB1/QK11pR2/Kq4b1/K1Qb2Np/rrbk4",
  "rPpRP3/rk1pKr2/Rn1Kr1Nr/R3RB2/1bN2B11/PKrk1111/KPP2rb1/QQK3pB",
  "pK3P1r/P1qQRn2/NrnQKB2/RNRk3q/pKp2r2/12q4/4b1Qr/PqBkNKN1",
  "QpKBPn2/B2q21Q/n22nk1/121R3/p2QRbn1/nRnnN3/BKk2QQB/2qQNn2",
  "brqKBk1K/p2qPbn1/qKp1KP11/p31pn1/RkrP2b1/BBbnB3/1pR2nB1/kBnNpB2",
  "BPq41/nNqknb2/pRNp3K/KpBnq21/1n2Q1K1/B1bP2K1/BKpr4/nqNrkRq1",
  "qNpBk1q1/qprN2n1/1PppnqRk/Q1PbQP2/bKrNNnR1/nrB3N1/rPPk4/r3p21",
  "111KQ21/3QP1rP/kn6/1bRpkK2/rNk1Prk1/kRpp22/bQnpkpN1/P1Pp2n1",
  "1Rkq4/nK1qPp11/2bkR1Rn/nNkpnB2/QQpq4/KKKpk3/NNqkR3/2RNkPQ1",
  "B2nKBB1/qB2p3/BpnKNN2/QB3RbB/3KKNp1/NQp5/pkk2b2/kKKN3Q",
  "pp1PQrqp/11BqR1PR/n11r21q/rNk2kB1/Nb2k111/1r15/1Rk1k1r1/qqr5",
  "kPbn2n1/bQbKRBB1/11BnNP2/1RpNBk2/kPkP2n1/r1Nkkk2/Q1rnnK2/q1Q3K1",
  "2PKnrBP/PpB3p1/bpkQ4/KBr5/Bbqr4/1KrB3R/BR1Rnr11/1NkPqnQN",
  "BKq2R11/kBkB31/q1111BPK/BRbPB3/NqNBBB2/3P1BbP/KnKPNB2/RNkrK1b1",
  "kN2RRn1/nQbbQ3/BBQk4/R13rN1/Qp3p2/NRRNr1rq/QRBkp12/kPnr1r2",
  "NNqbPK2/PPrBr3/bkNrqKn1/RRBk2b1/PKRRR3/q1PN1pq1/NRNnrNQ1/2PKk1N1",
  "bq1PqnR1/np1rBrq1/qqQ1b1Kk/ppr1kP2/KkNr2b1/Q1r1PRB1/qqP1pb2/nr1KQ3",
  "Bq1krkK1/nQn41/NKrNKNR1/Nk3Rp1/rNrqrnq1/n1p1b1r1/rnr3kq/QBKn22",
  "NK31pN/qR2KbP1/3NBrqn/KKnKPBk1/kpnP21N/rQQrRr2/K12RnR1/QRKQ4",
  "RKb1pbqb/qP3B2/RKK111n1/kBbP4/BN2Bqq1/BK11n1k1/NbNPR3/qr132",
  "1kbN4/bnN2KPQ/QKbPBNk1/q1N1pqP1/RbkRNn1n/BPbPNr2/qQk1QrN1/K2PbBP1",
  "kk1qKPRb/n3rnQN/nQbPbb2/1Q121PQ/11BbNnQ1/KKk1pQbQ/qQPrrkQQ/nNQkR21",
  "pQkqNq2/qQQR1kKP/1kKK1QPN/rNrQqK2/nbkr2K1/PqkRkn2/1pqNqpb1/Q1n1RN2",
  "2rrnBK1/prqB121/2BN4/1B4b1/QR2KKB1/Q2qnKb1/bQqPn1b1/1p2QQbr",
  "r1RKPq2/R111KbP1/qNb2Q11/BBp1Ppb1/r1PK2p1/11bB211/R1pQ2k1/1pk2P2",
  "1pnnKQ2/b111BbK1/RQ3RKr/PnKbPn2/1pr3bK/n1NRQ3/npQn2RB/N1pKKR2",
  "NKB1brk1/rBB5/Kq1Krpp1/1QpPBQ2/rrBn3B/RQnkBQR1/QqkBk3/pPnn22",
  "qqkBP3/1Pn1q1np/r2BP1qR/KPRK4/kPprKP2/PQbB4/R1npNNp1/qBnqR3",
  "bkpqR3/qNNqq3/Q31qB1/1q4nr/K11BKNr1/11bBr12/Nqkr4/1bQ1PbR1",
  "BNBn4/K1b32/1r22b1/1B2BNrN/qnKn4/bbpRqQKr/KPNRkk2/B2BbQ2",
  "1Bkp4/RRpp4/rB2QKPP/11pKk3/prnknr2/pBpk2Q1/1nKqNk2/pKKKPN2",
  "1Q2bpr1/qRQQpk2/qpKKq12/P3Qb2/rknPb3/1kkk4/PnPBP3/RkNrr3",
  "1B2rkQ1/bBN4Q/123r1/N2bqR2/1B1K21B/1B1Qk2q/pNKbBr2/N11qnQ1b",
  "1bNKRBbR/q2PBNK1/Bppbb11Q/1n2K1qk/RNBP21B/bbBrn3/p1pNNKk1/1kKQN3",
  "ppKbrnK1/BBBQr3/1qpr1rqr/1pp1NBbN/pqKrb3/b3Q3/qpqPb3/1rb1KN1p",
  "PKNq1kBk/NrQQQ3/KPr3Qq/rbqkB3/bkqn4/b1P21NR/KnRbqRk1/ppNpbk2",
  "1PBN111q/2nRQ2R/Nbb41/PQp3Kq/N1QnQn2/r1BbbB2/qrbn4/pp4nN",
  "P2q4/1RPQrk2/NpPNprRQ/BB1N4/pPqrR2P/1K3BP1/nQr2RN1/PPkq1RP1",
  "4bn11/QR211p1/NKpQqQ2/QkbR4/Kqk1nN2/kKN1rBp1/pBpNP3/nNrRR3",
  "11NNKPnB/b121R2/rrK1r1bb/P1kKb3/QpnK22/pbQ2rPR/RkRnk3/2Bp4",
  "RQBqn3/PQpqK1K1/kpkKR3/bPrNPN2/1N1Rbk2/P1b2rk1/ppRbNb2/NPKqk1bP",
  "BPkBBpK1/P1nQKq11/PrNn2p1/bnRK2k1/B111BRq1/B1qkB3/RBqP1qkQ/NB11rrqQ",
  "RNRNn21/KppkK3/RBBQRrQ1/K11r4/QP11N1p1/nq4Rr/11qpNQnr/bN1N112",
  "nbq23/5Rqk/KPpqnBB1/RBKkkK1N/K1qKkr2/kbQqB3/bBP2rB1/12bp3",
  "rKBb31/Kpn1RB1n/Brbp3q/rR31BN/1N1r1111/nBnRQq2/n1qPKr2/bPP2Rb1",
  "RKBpkpRQ/1QkPpNbq/r1PbrQR1/KPRq4/rPk2Kn1/kqbP1Qb1/qnQ5/2RqNr2",
  "bNPbQ3/q11nrQ2/pbBRb111/qbn1RQBr/pq1P121/1p2BK11/B1Q12qp/4B1Pn",
  "n2bppR1/bbB5/Qk1qnK2/QrRBqnb1/kBqp4/1Nbqq3/211qn2/rPpBn1k1",
  "pK1Pkb2/11NbPQ2/RNNp4/11BkNr2/P11NRrN1/n1k1bqkN/nPq31B/bNk4B",
  "K2BpnP1/BQ1R1QbB/21R2K1/111QqQq1/qKRBbN2/1qB1KBN1/RkqRK12/nPrnKKBn",
  "QprQNn2/k1prB3/1rNQkRq1/PPRQQpp1/QKnQnr2/qKN3n1/N1R11P2/Q2Bbk1r",
  "kRQkqK2/rqQQnr2/qKknb3/NbRRN3/QnrN4/pQnb21b/BNbbk3/kbNBn12",
  "QBq1b21/k2kQ21/PB1BKnP1/1bp1nPn1/RQ1q1pnN/BQpbK1KP/1b1PBQp1/1kBkkPP1",
  "KQ3rKq/P1qbrQ2/kN2PBB1/rn6/111RR2R/RBrnq3/qqNBP21/N3Q3",
  "kkrNQQp1/PPbQBb2/1pRB4/b21q2K/rKQ3R1/RQ1nRP2/2Bqn3/KnBbqbQb",
  "nB3k1r/k21pNr1/RQb1k3/n1nbrnr1/qnqRpBKP/nQpkNn2/QQBpkQ2/NkrRKB2",
  "1qNKP1n1/bqk21r1/1BPpRB2/PqRQbqq1/nrKbp2k/NKBBKn1b/KnBpnN2/RRPKK3",
  "nQk2BP1/bqPnq3/BNRQQN2/QpBn2np/Pn1pknnn/rBbk4/nK2rN2/QkBrK1kB",
  "KPKKqBpn/1qbr31/k322/K12kN1r/BQpBpR2/kKNPRn2/kBK3q1/QNKKqK2",
  "qKPK4/1qRrNkq1/RQ1BR21/1NP2K1b/PbRKQQP1/QrNNRRr1/kR3b2/QnPPk3",
  "1brQRKBB/KBBr1ppN/qNB1bNb1/qKBkpnP1/QRrNNB2/QBpBn3/1brQn3/rNPkKbB1",
  "kPbNN3/KPKR21N/1pnNRB2/pKKkrK2/1rprNr2/Pp1qnN2/1Pnnqb11/QRN5",
  "qkB2NQ1/RqBn4/nbKk2pq/rnrK2kQ/rPQKnnB1/pPQkQ3/1b3Nr1/kRRrRkn1",
  "QnrqBKRr/krBBR1BR/qPrQPpK1/bkkrqBK1/prB2rK1/nQbrNrK1/1RR2nNP/31p3",
  "nbPpR3/N1PPpQ2/pBkKq3/qN1N4/k1kPPP2/2rKkPKr/Nq21qq1/1RRkr2b",
  "ppKnP3/11p21p1/Bb1r1br1/2brNPb1/2nnP2n/BQ1krPk1/NBNN1BR1/QNPqkpQ1",
  "3BKnP1/rp11PPk1/kBPQqK2/npQ2kQ1/5RQb/QrrBr1p1/bPrNPB2/kKRQKkNb",
  "RnPP4/1PbqBbQ1/Qqp1QR2/2pKKB2/rrnrqNQB/3BNq2/111NQN11/1Qk3P1",
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP",
  "rnK3b1/B12QK2/nKRnqP2/p1PNNb2/brrknP2/1b1RQ2r/KNR1Pk2/QQQ32",
  "2bbr2q/11PPqQ2/bbrnKBB1/nKRPkPk1/QNNqqB2/k3bq2/rq4q1/K1QQnQ11",
  "rpkPRn2/bPq2nK1/Q2pNqp1/rPQp1p1R/Nk2bn2/k2p1nbP/nr1QP1Pn/rBP5",
  "qqKPb3/1PQnN3/1qprn3/Pkk5/KR21P2/1PKQbN2/nB1BpB1p/qbNrbk2",
  "pn3KN1/2RK1Bp1/1PkQppP1/nnqPqbp1/1K1KR1Rb/q1RnpQr1/BQBBk12/1KkbK3",
  "Nn1pbb2/NPr2BQ1/pBBN4/Bb4P1/kNR1RN2/q3pb2/rP1BNN2/1rb1Kkqb",
  "KbR1R11q/3kkR1P/R2B2p1/RNB5/pR2K3/KpBRqR2/pPnBRknq/qkp5",
  "BBb3pR/N3bBn1/kN2RKQk/R511/RnqbqNr1/Nb2B1k1/bn3q2/4Rqr1",
  "3RpbQP/rRNBB111/Q1kKrQr1/PB1K31/n1q1QPn1/2B11BRK/rp1KpQ1K/NpPNqBK1",
  "npbrPb2/2bnb3/1rK4Q/PqNbq3/1RnPnp2/QprPq3/1nRbb3/BN3KRP",
  "PNPPB3/11RNbn2/nrQnB3/PQRNR3/nnBnk1p1/PQRb31/p3KQkN/qr1NK111",
  "1qnRr11P/QpPbRRP1/11RpQp2/kbrNr3/rKKP4/1qR1QPQb/1B21pP1/1KBpnR2",
  "k1nqpkKR/p421/1R13KB/P3npR1/rn1BRp2/rPPB3k/p211B11/1npQN3",
  "qP321/NKrRRbr1/1KQ1qPK1/1bBk4/rpKrPP2/qRpkn2N/nQQpQ3/q12BRk1",
  "kBnNRr2/QQbKBK2/3rrrr1/KBN4N/QnqPrpq1/b2bppQq/BRn21P1/rRPPqq2",
  "11Q12Qb/KPKbrNK1/PQ1qbB1R/BBBkP21/RBnK4/nKqbK3/BKn5/1Q11kQ2",
  "pNPPbNB1/3nkbP1/Rpr2n1R/BqB2p2/pqkrbk2/Pp1QP3/NQrQQN2/KnK2qr1",
  "k11bqkN1/2PNqB2/KqQBKQq1/1nkKK3/221r2/bNPNBNPQ/br3bKN/RqP1KRb1",
  "1P1nRrKk/NbqrnBPR/3R3n/QNnb4/KknQ1qQr/n4111/nK1RQQ2/Rkpr3n",
  "k2121N/q42n/Nr1r112/RK14p/3kqbr1/1Q1KnQR1/pnpp1Kk1/k2PPN2",
  "rBRbNk2/1rpB4/2qQBnQp/nQk3pk/PB2qQ1n/rBkk3B/2N11pp1/kNBnn3",
  "Rk3nb1/Qn6/11qRbBN1/rB2b1RQ/NNnn1RB1/rPQr1RR1/nQnnBB2/RbQPkN1P",
  "K5p1/1KRBn3/qn11k21/RnRNbb2/Qkb212/1PrnPr2/B2PB3/p1NQQ3",
  "BrPBNn2/pb1Krb2/k1K11PkN/k1knK3/Kb2QNR1/PQNrnRR1/2nPkrQ1/QNpkbQp1",
  "N12r11K/1QNBqKR1/Bk4Qr/kq1p31/b1q3P1/11qRRp2/k4kN1/BNR3n1",
  "abcd/abcd/abcd/abcd/abcd/abcd/abcd/abcd",
  "bbnQr3/QKRNNn2/bNnRk3/qkN41/R1kQNk2/p2kPnN1/1K6/k1qnBbr1",
  "QrKKrN2/1bbQB3/1QBQbbN1/nBnPNpQp/bbpbnP2/2N5/Nkn4p/1Kkkk3",
  "pKpbN3/Kn2B21/2bRBr2/1rPrbBn1/rk3Q1R/rBkR4/11RRrr11/rNBBk3",
  "Br6/QKKQP3/n1BpBR2/NNpNnR2/QNN3p1/nP2KB1B/nBkb4/prkbqRb1",
  "2bP2pK/bbRkNq2/rbpRnq2/K11k31/KBNNp3/p12krQ1/knK41/nb111B11",
  "RRR1QKk1/qbrbrKn1/1PnpNb2/Q1bqB3/QqP21Kk/111pNRR1/1rPQ31/QnQrKn2",
  "QPq41/QnpP4/kKqrQrK1/N3pRN1/bBp1kK2/1KQ3P1/pnRnP3/n1BQr2k",
  "1K1bKr1P/brq2r1P/nBPQb3/bKR5/RQQ3q1/KNqk4/B12qQr1/bNr1B111",
  "1kkBr3/B2kkR2/qB321/111N3p/nn21QPR/1KBQn21/nKN1KNp1/Qqb1Qb2",
  "r111BqQb/QRqB3p/KPRpn1b1/1RR11npK/p1rrNpP1/1n21kk1/1nR1QN1r/BQ3Bp1",
  "bqQpBp2/2r1nPP1/p1r2Q2/p3kQ2/knrNq3/kknKQb2/Ppq4R/1bb11Nq1",
  "1pq3r1/rBnq1pk1/1KrQRr2/Qbqnk3/12B2Pn/1rrPnPp1/n1QNnPPR/1rQN1kbr",
  "QBQr2B1/NB1PN21/qQq212/RBbPPR2/n1bQkKnq/NKrKNN2/1kk2rr1/RK1NKqp1",
  "kQnpk2q/qQnNQN2/RQ2bB2/1k1qnK2/nbkqbn2/PbrpN3/qkBr1b11/bNQ21N1",
  "KkPbr1p1/nQBBqQ2/bkk4b/brKkNB2/1P2Nqnp/RrN3n1/1QQRNbBp/kNkNB1N1",
  "brRRpBqN/qnPQ11Nq/kp11pQk1/KkKr4/2Bq4/NkkR21B/q1KNQ1N1/k21QnQR",
  "nkKN3p/B3PB2/Q2nPq2/BRKKRRKb/qRNNQq2/R11PrKR1/1R2Q12/RRnb1B2",
  "11kPKnr1/p3KP2/1kpppPk1/1RnRq3/21nbPR1/pQKNB3/kNpNp3/pqBqPP2",
  "bkQ2pqK/N1QKkn11/BRkP4/3qpbB1/1bRR4/n211K2/1rkpprN1/p1nKN1qq",
  "1pr1QkB1/qkR1Rrq1/QKrQ2Q1/rKNpkP2/nN411/qB3BbP/1q1b1pbR/Pnr11nn1",
  "rBQrRBr1/11rPPK2/PNRKr3/Rp2QN2/KR1nPp2/RnpKN2r/bPK2k11/KKrr4",
  "Rn5r/b3nK2/R1rPrbqp/rbpQ2k1/B1RqQ3/QBp4K/pQKpRb2/QKkR1PkN",
  "bqRqbk2/rrBNKBP1/rPPnP3/nNBpq3/NqKP4/2kBR1B1/N1k41/rPqKn111",
  "PQ1rRB2/11Bb1nK1/KnN12RP/nKK2B1N/bP5q/RrqQN3/nQb11NK1/Pqb2kP1",
  "Bk1p1qB1/qkkKP3/KNqPqR2/PBNp2PN/PkpRr3/pq1q1BPK/B1BkQ1k1/BB2KR11",
  "bn1Rpb2/1kqNNk2/rppk3q/QP2qbk1/k1pqbBQP/bKrB22/b2bB1n1/Kp2kn2",
  "rKPPQ3/1kbqN2B/rPkbKQ2/bKRq11q1/NQK1NRQ1/Q1ppkq2/Q4n2/KN1q12p",
  "rRpN31/NPqN31/PpQrr3/bbb1Kn11/qbrQq3/Rqn1KBrN/rb1q211/pkK2bB1",
  "KkprNQ2/1Np1PkR1/n1N1PQ2/N1rKbr2/1q1B21p/pK2Bk11/1KpNkK2/P1rB1R11",
  "rnkPbq2/1rRqpBN1/3pN3/nPBqNN2/QbqkB3/Q2Qbqnp/rP1RpQ2/Krqp4",
  "NkpB4/nPk11qKN/21pk21/rRq5/11BqR3/RQBbbr2/r1n2pr1/RnkKq2k",
  "NNqRbRK1/KK3Pb1/QBq21b1/kKNkPKK1/b2bkn2/11RPR1b1/R1nQB3/N2QRB2",
  "BQQ1r2Q/1qnqn3/2PrN12/QBrBK3/nP1pP1Bb/BBQ2Nn1/qpk13k/Rb2QpR1",
  "3Q1Bbk/k3N3/rBqB3q/2R1PQr1/1PBN2nq/nbRQk3/Nn3Qp1/nrB3p1",
  "bNBnk3/1b1kp12/1kkBbqN1/2BrqP2/pbRk4/1RPRRq2/K11PkQPK/N211P11",
  "Kqq32/12N22/RPRQbn2/kKP221/pnrbQP2/1QbpBK2/1bb11nn1/2R1RN2",
  "prN2QbN/Q1KKB3/KP2B21/rn1P1NP1/Kbn1N3/kb2P3/k1P1BkBQ/Kb1qpR2",
  "2NrR3/2BnNq2/B4B11/p1qBpN2/Q1bN3N/bPr21Bb/KPkP4/q11ppkP1",
  "41prP/13kk2/Q2K11p1/q31B11/RBQQn3/pQK3r1/rR3kP1/KN2nNP1",
  "BKnN21r/k1P1BrB1/K1Q41/bqN112q/qrBnb3/1qNPBkb1/11b1bb2/qK4r1",
  "RQPKb21/1kKkqn2/BNNRr3/1nqbkNN1/RKknNp2/1rPrrp2/1KKK2qr/1Rp1RBN1",
  "KbQKKP2/bpR1Nk2/3N1Brb/qNprQ3/B1kr4/2RpnP11/nPbQK1Q1/RQbKRQk1",
  "NnRn2q1/r1bqNBr1/NNn2kP1/K11rnb2/111RP2K/BNKQR3/Q1pkkb2/PKk1qQ2",
  "QbrK4/1PpKKqB1/1pBKKnk1/qrq3K1/1RKKPPR1/pBKPb3/PBPRnN1k/1pN22p",
  "1N1P2nk/1KBKq3/N2Nk3/pBPPpKN1/1PqPbq2/nknQQqr1/rkb2Pbr/1q3bnB",
  "qR1QKKNR/11qPk2K/QB3QnB/Pnq2r1N/b2nBn2/1bkk4/nBp2Pb1/K11rRnk1",
];

/*const path: Record<TPiece, Path2D> = {
    wP: (() => {
      const p = new Path2D();
      // Cabeça
      p.arc(0, -28, 6, 0, Math.PI * 2);
      // Pescoço
      p.moveTo(-4, -22);
      p.lineTo(4, -22);
      p.lineTo(4, -18);
      p.lineTo(-4, -18);
      p.closePath();
      // Corpo
      p.moveTo(-8, -18);
      p.lineTo(8, -18);
      p.lineTo(6, 0);
      p.lineTo(-6, 0);
      p.closePath();
      // Base
      p.moveTo(-10, 0);
      p.lineTo(10, 0);
      p.lineTo(10, 6);
      p.lineTo(-10, 6);
      p.closePath();
      return p;
    })(),

    bP: (() => {
      const p = new Path2D();
      // Cabeça
      p.arc(0, -28, 6, 0, Math.PI * 2);
      // Pescoço
      p.moveTo(-4, -22);
      p.lineTo(4, -22);
      p.lineTo(4, -18);
      p.lineTo(-4, -18);
      p.closePath();
      // Corpo
      p.moveTo(-8, -18);
      p.lineTo(8, -18);
      p.lineTo(6, 0);
      p.lineTo(-6, 0);
      p.closePath();
      // Base
      p.moveTo(-10, 0);
      p.lineTo(10, 0);
      p.lineTo(10, 6);
      p.lineTo(-10, 6);
      p.closePath();
      return p;
    })(),

    wR: (() => {
      const p = new Path2D();
      // Base
      p.moveTo(-12, 6);
      p.lineTo(12, 6);
      p.lineTo(12, -20);
      // Torre com crenulações
      const crenches = [-12, -6, 0, 6, 12];
      for (let i = 0; i < crenches.length - 1; i++) {
        p.lineTo(crenches[i], -26);
        p.lineTo(crenches[i + 1], -26);
        p.lineTo(crenches[i + 1], -20);
      }
      p.closePath();
      return p;
    })(),

    bR: (() => {
      const p = new Path2D();
      // Base
      p.moveTo(-12, 6);
      p.lineTo(12, 6);
      p.lineTo(12, -20);
      // Torre com crenulações
      const crenches = [-12, -6, 0, 6, 12];
      for (let i = 0; i < crenches.length - 1; i++) {
        p.lineTo(crenches[i], -26);
        p.lineTo(crenches[i + 1], -26);
        p.lineTo(crenches[i + 1], -20);
      }
      p.closePath();
      return p;
    })(),

    wN: (() => {
      const p = new Path2D();

      // Corpo base do cavalo
      p.moveTo(-12, 6);
      p.bezierCurveTo(-8, 0, -6, -12, -4, -20); // pescoço
      p.bezierCurveTo(-3, -24, 0, -28, 6, -28); // cabeça/focinho
      p.bezierCurveTo(8, -28, 8, -24, 6, -22); // parte frontal da cabeça
      p.bezierCurveTo(4, -24, 2, -26, 0, -26); // topo da cabeça
      p.bezierCurveTo(-2, -26, -4, -24, -6, -20); // crina parte de trás
      p.lineTo(-8, -14); // volta pro pescoço
      p.bezierCurveTo(-10, -6, -10, 0, -12, 6); // base corpo
      p.closePath();

      // Crina detalhada (opcional, para dar textura)
      p.moveTo(-6, -20);
      p.lineTo(-5, -22);
      p.lineTo(-4, -20);
      p.lineTo(-3, -22);
      p.lineTo(-2, -20);

      return p;
    })(),

    bN: (() => {
      const p = new Path2D();

      // Corpo base do cavalo
      p.moveTo(-12, 6);
      p.bezierCurveTo(-8, 0, -6, -12, -4, -20); // pescoço
      p.bezierCurveTo(-3, -24, 0, -28, 6, -28); // cabeça/focinho
      p.bezierCurveTo(8, -28, 8, -24, 6, -22); // parte frontal da cabeça
      p.bezierCurveTo(4, -24, 2, -26, 0, -26); // topo da cabeça
      p.bezierCurveTo(-2, -26, -4, -24, -6, -20); // crina parte de trás
      p.lineTo(-8, -14); // volta pro pescoço
      p.bezierCurveTo(-10, -6, -10, 0, -12, 6); // base corpo
      p.closePath();

      // Crina detalhada (opcional, para dar textura)
      p.moveTo(-6, -20);
      p.lineTo(-5, -22);
      p.lineTo(-4, -20);
      p.lineTo(-3, -22);
      p.lineTo(-2, -20);

      return p;
    })(),

    wB: (() => {
      const p = new Path2D();
      p.moveTo(-10, 6);
      p.lineTo(10, 6);
      // Corpo
      p.bezierCurveTo(6, 0, 6, -28, 0, -36);
      p.bezierCurveTo(-6, -28, -6, 0, -10, 6);
      // Fenda no topo
      p.moveTo(-2, -36);
      p.lineTo(2, -36);
      p.closePath();
      return p;
    })(),

    bB: (() => {
      const p = new Path2D();
      p.moveTo(-10, 6);
      p.lineTo(10, 6);
      // Corpo
      p.bezierCurveTo(6, 0, 6, -28, 0, -36);
      p.bezierCurveTo(-6, -28, -6, 0, -10, 6);
      // Fenda no topo
      p.moveTo(-2, -36);
      p.lineTo(2, -36);
      p.closePath();
      return p;
    })(),

    wQ: (() => {
      const p = new Path2D();
      p.moveTo(-12, 6);
      p.lineTo(12, 6);
      // Corpo
      p.bezierCurveTo(10, -10, 10, -30, 0, -36);
      p.bezierCurveTo(-10, -30, -10, -10, -12, 6);
      // Coroa
      p.moveTo(-6, -36);
      p.lineTo(-3, -42);
      p.lineTo(0, -36);
      p.lineTo(3, -42);
      p.lineTo(6, -36);
      p.closePath();
      return p;
    })(),

    bQ: (() => {
      const p = new Path2D();
      p.moveTo(-12, 6);
      p.lineTo(12, 6);
      // Corpo
      p.bezierCurveTo(10, -10, 10, -30, 0, -36);
      p.bezierCurveTo(-10, -30, -10, -10, -12, 6);
      // Coroa
      p.moveTo(-6, -36);
      p.lineTo(-3, -42);
      p.lineTo(0, -36);
      p.lineTo(3, -42);
      p.lineTo(6, -36);
      p.closePath();
      return p;
    })(),

    wK: (() => {
      const p = new Path2D();
      p.moveTo(-12, 6);
      p.lineTo(12, 6);
      // Corpo
      p.bezierCurveTo(10, -12, 10, -32, 0, -38);
      p.bezierCurveTo(-10, -32, -10, -12, -12, 6);
      // Cruz
      p.moveTo(-2, -42);
      p.lineTo(2, -42);
      p.moveTo(0, -44);
      p.lineTo(0, -40);
      p.closePath();
      return p;
    })(),

    bK: (() => {
      const p = new Path2D();
      p.moveTo(-12, 6);
      p.lineTo(12, 6);
      // Corpo
      p.bezierCurveTo(10, -12, 10, -32, 0, -38);
      p.bezierCurveTo(-10, -32, -10, -12, -12, 6);
      // Cruz
      p.moveTo(-2, -42);
      p.lineTo(2, -42);
      p.moveTo(0, -44);
      p.lineTo(0, -40);
      p.closePath();
      return p;
    })(),
  };*/

/*const imagens = await loadImages([
        "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d", // skyline
        "https://images.unsplash.com/photo-1516117172878-fd2c41f4a759", // coding laptop
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e", // portrait
        "https://images.unsplash.com/photo-1506765515384-028b60a970df", // mountains
        "https://images.unsplash.com/photo-1525182008055-f88b95ff7980", // street
        "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a", // coffee
        "https://images.unsplash.com/photo-1507149833265-60c372daea22", // dog
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e", // forest
        "https://images.unsplash.com/photo-1481349518771-20055b2a7b24", // cat
      ]);*/

const hoverTest: {
  draw: (ctx: TSafeCtx) => void;
}[] = [
  {
    //label: "fillRect",
    draw: (ctx: TSafeCtx) => {
      ctx.fillStyle = "red";
      ctx.fillRect(50, 50, 60, 60);
    },
  },
  {
    //label: "strokeRect",
    draw: (ctx: TSafeCtx) => {
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 3;
      ctx.strokeRect(150, 50, 70, 70);
    },
  },
  {
    //label: "fillText",
    draw: (ctx: TSafeCtx) => {
      ctx.fillStyle = "green";
      ctx.font = "20px monospace";
      ctx.fillText("TEST", 350, 90);
    },
  },
  {
    //label: "strokeText",
    draw: (ctx: TSafeCtx) => {
      ctx.strokeStyle = "orange";
      ctx.font = "20px monospace";
      ctx.strokeText("EDGE", 450, 90);
    },
  },
  {
    //label: "arc (circle)",
    draw: (ctx: TSafeCtx) => {
      ctx.beginPath();
      ctx.arc(100, 200, 30, 0, Math.PI * 2);
      ctx.fillStyle = "purple";
      ctx.fill();
    },
  },
  {
    //label: "ellipse",
    draw: (ctx: TSafeCtx) => {
      ctx.beginPath();
      ctx.ellipse(200, 200, 40, 25, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "brown";
      ctx.stroke();
    },
  },
  {
    //label: "path polygon",
    draw: (ctx: TSafeCtx) => {
      ctx.beginPath();
      ctx.moveTo(300, 180);
      ctx.lineTo(340, 220);
      ctx.lineTo(260, 220);
      ctx.closePath();
      ctx.fillStyle = "pink";
      ctx.fill();
    },
  },
  {
    //label: "quadraticCurveTo",
    draw: (ctx: TSafeCtx) => {
      ctx.beginPath();
      ctx.moveTo(400, 200);
      ctx.quadraticCurveTo(450, 150, 500, 200);
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
  },
  {
    //label: "bezierCurveTo",
    draw: (ctx: TSafeCtx) => {
      ctx.beginPath();
      ctx.moveTo(100, 300);
      ctx.bezierCurveTo(150, 250, 200, 350, 250, 300);
      ctx.strokeStyle = "magenta";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
  },
  {
    //label: "fill (custom path)",
    draw: (ctx: TSafeCtx) => {
      ctx.beginPath();
      ctx.rect(300, 280, 50, 50);
      ctx.fillStyle = "lime";
      ctx.fill();
    },
  },
  {
    //label: "stroke (custom path)",
    draw: (ctx: TSafeCtx) => {
      ctx.beginPath();
      ctx.rect(400, 280, 50, 50);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "yellow";
      ctx.stroke();
    },
  },
  {
    //label: "rotate+scale simulation",
    draw: (ctx: TSafeCtx) => {
      ctx.fillStyle = "#444";
      ctx.fillRect(-30, -30, 60, 60);
    },
  },
  {
    //label: "Path2D fill",
    draw: (ctx: TSafeCtx) => {
      const path = new Path2D();
      path.moveTo(50, 300);
      path.lineTo(100, 350);
      path.lineTo(50, 350);
      path.closePath();
      ctx.fillStyle = "teal";
      ctx.fill(path);
    },
  },
  {
    //label: "Path2D stroke",
    draw: (ctx: TSafeCtx) => {
      const path = new Path2D();
      path.moveTo(150, 300);
      path.lineTo(200, 350);
      path.lineTo(150, 350);
      path.closePath();
      ctx.strokeStyle = "darkred";
      ctx.lineWidth = 2;
      ctx.stroke(path);
    },
  },
  {
    //label: "drawImage with HTMLCanvasElement",
    draw: (ctx: TSafeCtx) => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 50;
      tempCanvas.height = 50;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.fillStyle = "purple";
        tempCtx.fillRect(0, 0, 50, 50);
        ctx.drawImage(tempCanvas, 250, 300, 50, 50);
      }
    },
  },
  {
    //label: "drawImage with HTMLVideoElement",
    draw: (ctx: TSafeCtx) => {
      const video = document.createElement("video");
      video.src = "https://www.w3schools.com/html/mov_bbb.mp4";
      video.muted = true;

      video.addEventListener("loadeddata", () => {
        // Agora já tem frame para desenhar
        ctx.drawImage(video, 350, 300, 80, 45);
      });

      video.play().catch(() => {
        console.warn("Vídeo não pode ser reproduzido automaticamente");
      });
    },
  },
  {
    //label: "roundRect fill",
    draw: (ctx: TSafeCtx) => {
      if (typeof ctx.roundRect === "function") {
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.roundRect(400, 300, 60, 40, 10);
        ctx.fill();
      }
    },
  },
  {
    //label: "roundRect stroke",
    draw: (ctx: TSafeCtx) => {
      if (typeof ctx.roundRect === "function") {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(500, 300, 60, 40, 10);
        ctx.stroke();
      }
    },
  },
]; //

export { runAllClearStressTests, loadImages, testFen, hoverTest };
