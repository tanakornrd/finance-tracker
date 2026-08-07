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

export function useKeepBubbleOnScreen({ anchorRef, anchorFrac = 0.5, gap = 6, deps = [] }) {
  const bubbleRef = useRef(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
  const [pos, setPos] = useState(null); // null until first measured (bubble stays hidden until then, no flash-at-wrong-spot)

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, anchorFrac, gap, ...deps]);

  return { isMobile, bubbleRef, pos };
}
