import { useLayoutEffect, useRef, useState } from "react";

// Shared by WarriorMascot/MageMascot's speech bubbles — desktop (>=1280px) keeps rendering the
// bubble exactly as it always has (absolutely positioned relative to the mascot, no measurement,
// no portal, zero behavior change). Below that breakpoint, callers instead portal the bubble to
// document.body (see ModalPortal — same idiom already used for every bottom-sheet modal, so this
// escapes any ancestor's `overflow:hidden` the same way those do) and this hook measures the
// bubble's REAL rendered size/position with getBoundingClientRect, then clamps it to stay fully
// inside the viewport with a safe margin. A fixed CSS offset (the old approach) can't know how
// long the message text is or exactly where the mascot landed on a given phone width — a real
// measurement is the only way to guarantee "always on screen" regardless of either.
//
// anchorRef: ref on the mascot's own wrapper (button/div) — the thing the bubble should appear
// beside. anchorFrac: where along the anchor's height to vertically center the bubble (see each
// caller's own SpeechBubble comment for why its particular value). gap: horizontal distance
// between the bubble's near edge and the mascot, in px — defaults to 6, the same
// marginRight/marginLeft the old inline-positioned bubbles used, but callers can tighten it.
// deps: extra values (e.g. the message text) that should trigger a re-measure when they change.
const MOBILE_QUERY = "(max-width: 1279px)";
const SAFE_MARGIN = 10;

// Exported separately — WarriorMascot uses this on its own (not just via useKeepBubbleOnScreen
// below) to decide whether to show its persistent idle message on mobile at all, not just how
// to position it. Same breakpoint/query as everything else in the app.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export function useKeepBubbleOnScreen({ anchorRef, anchorFrac = 0.5, gap = 6, deps = [] }) {
  const bubbleRef = useRef(null);
  const isMobile = useIsMobile();
  const [pos, setPos] = useState(null); // null until first measured (bubble stays hidden until then, no flash-at-wrong-spot)

  useLayoutEffect(() => {
    if (!isMobile) {
      setPos(null);
      return undefined;
    }

    function measure() {
      const anchor = anchorRef.current;
      const bubble = bubbleRef.current;
      if (!anchor || !bubble) return;
      const a = anchor.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      // Same visual convention as the old fixed-offset bubbles: sits to the anchor's left,
      // vertically centered at anchorFrac of the anchor's own height.
      let left = a.left - gap - b.width;
      let top = a.top + a.height * anchorFrac - b.height / 2;
      left = Math.min(Math.max(left, SAFE_MARGIN), window.innerWidth - SAFE_MARGIN - b.width);
      top = Math.min(Math.max(top, SAFE_MARGIN), window.innerHeight - SAFE_MARGIN - b.height);
      setPos({ left, top });
    }

    measure();
    // A few more passes just after mount, not just the one above — MageMascot's card can still
    // be settling layout at that exact instant (the web font swapping in, sibling SlimeEnemy
    // images affecting the row's height, etc.), and the very first measure() can catch a
    // not-yet-final position/size. Cheap (a handful of getBoundingClientRect calls, no visible
    // effect once the position stops changing) and self-limiting.
    const raf1 = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });
    const settleTimer = setTimeout(measure, 400);
    // A second, later pass — the keyboard-close animation that can immediately precede this
    // mount (see the visualViewport listener's comment below) sometimes takes noticeably longer
    // than 400ms to fully settle on iOS.
    const settleTimer2 = setTimeout(measure, 700);

    window.addEventListener("resize", measure);
    // Scroll, not just resize — getBoundingClientRect is viewport-relative, and `position:fixed`
    // means a stale measurement stays pinned to wherever the anchor USED to be on screen. Fine
    // for WarriorMascot (its card sits at the very top of Dashboard, already in view on mount),
    // but MageMascot on the Budgets page sits further down: measuring once on mount and never
    // again left the bubble pinned to whatever position the mage happened to be at when it first
    // mounted, silently drifting away from him (often off-screen entirely) the moment the page
    // scrolled.
    window.addEventListener("scroll", measure, { passive: true });
    // visualViewport's own resize/scroll — same reasoning as App.jsx's --app-vh mechanism (see
    // its comment): the on-screen keyboard opening/closing does NOT reliably fire a plain window
    // "resize" on every mobile browser, only visualViewport does. This specifically matters here
    // because Dashboard.jsx's submitTx() closes the add-transaction sheet (which can dismiss the
    // keyboard, since the amount field was likely focused) in the same tick it sets
    // mageFiring=true — so this bubble's very first mount/measure can land mid-keyboard-close,
    // capturing a transient, wrong position (observed: the bubble landing far down near the "+"
    // FAB instead of beside the mage) that the plain resize/scroll listeners above never
    // corrected afterward, since no plain resize/scroll event necessarily follows.
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", measure);
      vv.addEventListener("scroll", measure);
    }

    // Catches the anchor's own box changing size/position for any reason not covered above
    // (layout shifts from something else on the page loading in late) — belt-and-suspenders
    // alongside the explicit listeners, since ResizeObserver only fires on the anchor's own box
    // changing, not e.g. plain scrolling.
    let ro;
    if (typeof ResizeObserver !== "undefined" && anchorRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(anchorRef.current);
    }

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(settleTimer);
      clearTimeout(settleTimer2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      if (vv) {
        vv.removeEventListener("resize", measure);
        vv.removeEventListener("scroll", measure);
      }
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, anchorFrac, gap, ...deps]);

  return { isMobile, bubbleRef, pos };
}
