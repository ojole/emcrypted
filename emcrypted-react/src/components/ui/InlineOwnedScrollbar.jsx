import React, { useEffect, useState } from "react";

const MIN_THUMB_HEIGHT = 34;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const InlineOwnedScrollbar = ({ targetRef, className = "" }) => {
  const [metrics, setMetrics] = useState({
    visible: false,
    top: 0,
    height: MIN_THUMB_HEIGHT,
  });

  useEffect(() => {
    const host = targetRef?.current;
    if (!host || typeof window === "undefined") return undefined;

    let frame = 0;

    const update = () => {
      frame = 0;
      const { scrollTop, scrollHeight, clientHeight } = host;

      if (scrollHeight <= clientHeight + 1) {
        setMetrics((prev) =>
          prev.visible
            ? { visible: false, top: 0, height: MIN_THUMB_HEIGHT }
            : prev
        );
        return;
      }

      const ratio = clientHeight / scrollHeight;
      const thumbHeight = clamp(
        Math.round(clientHeight * ratio),
        MIN_THUMB_HEIGHT,
        clientHeight
      );
      const maxScroll = Math.max(1, scrollHeight - clientHeight);
      const maxTop = Math.max(0, clientHeight - thumbHeight);
      const thumbTop = Math.round((scrollTop / maxScroll) * maxTop);

      setMetrics((prev) => {
        if (
          prev.visible &&
          prev.top === thumbTop &&
          prev.height === thumbHeight
        ) {
          return prev;
        }
        return { visible: true, top: thumbTop, height: thumbHeight };
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    requestUpdate();
    host.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });

    let observer;
    if ("ResizeObserver" in window) {
      observer = new ResizeObserver(requestUpdate);
      observer.observe(host);
    }

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      host.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (observer) observer.disconnect();
    };
  }, [targetRef]);

  return (
    <div
      className={`inline-owned-scrollbar ${
        metrics.visible ? "inline-owned-scrollbar-visible" : ""
      } ${className}`.trim()}
      aria-hidden="true"
    >
      <div
        className="inline-owned-scrollbar-thumb"
        style={{
          height: `${metrics.height}px`,
          transform: `translateY(${metrics.top}px)`,
        }}
      />
    </div>
  );
};

export default InlineOwnedScrollbar;
