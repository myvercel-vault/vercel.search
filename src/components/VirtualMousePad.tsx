import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, MousePointer, X } from 'lucide-react';

interface VirtualMousePadProps {
  enabled: boolean;
  onClose: () => void;
}

export function VirtualMousePad({ enabled, onClose }: VirtualMousePadProps) {
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 320, y: 240 });
  const dragState = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    setCursor({
      x: Math.round(window.innerWidth * 0.5),
      y: Math.round(window.innerHeight * 0.45),
    });
  }, [enabled]);

  if (!enabled) return null;

  const handlePadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  };

  const handlePadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const dx = (e.clientX - dragState.current.lastX) * 1.85;
    const dy = (e.clientY - dragState.current.lastY) * 1.85;
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;

    setCursor((prev) => ({
      x: Math.max(8, Math.min(window.innerWidth - 12, prev.x + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 12, prev.y + dy)),
    }));
  };

  const handlePadPointerUp = () => {
    dragState.current.active = false;
  };

  const triggerVirtualClick = () => {
    const target = document.elementFromPoint(cursor.x, cursor.y) as HTMLElement | null;
    if (!target) return;
    target.focus?.();
    target.click();
  };

  const scrollPage = (deltaY: number) => {
    window.scrollBy({ top: deltaY, behavior: 'smooth' });
  };

  return (
    <>
      {/* Virtual Cursor Overlay */}
      <div
        aria-hidden="true"
        style={{
          transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
        }}
        className="pointer-events-none fixed left-0 top-0 z-[70] -ml-1.5 -mt-1.5 transition-transform duration-75"
      >
        <div className="h-5 w-5 rounded-full border-2 border-neutral-950 dark:border-white bg-white/80 dark:bg-black/80 shadow-md flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-neutral-950 dark:bg-white" />
        </div>
      </div>

      {/* Floating Monochrome Trackpad Dock */}
      <div
        aria-label="Virtual Mouse Pad"
        className="fixed bottom-4 right-4 z-[65] w-56 rounded-xl border border-neutral-300 dark:border-white/20 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shadow-2xl p-2.5 select-none"
      >
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            <MousePointer className="h-3 w-3" />
            <span>Mouse Pad</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Turn off virtual mouse pad"
            className="p-0.5 text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          onPointerDown={handlePadPointerDown}
          onPointerMove={handlePadPointerMove}
          onPointerUp={handlePadPointerUp}
          onPointerCancel={handlePadPointerUp}
          className="h-28 w-full rounded-lg border border-dashed border-neutral-300 dark:border-white/20 bg-neutral-100/80 dark:bg-black/80 flex items-center justify-center text-[11px] text-neutral-400 dark:text-neutral-500 touch-none cursor-grab active:cursor-grabbing"
        >
          Drag to move cursor
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={triggerVirtualClick}
            className="col-span-2 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black py-1.5 text-xs font-medium active:scale-95 transition-transform"
          >
            Tap / Click
          </button>
          <button
            type="button"
            onClick={() => scrollPage(-260)}
            aria-label="Scroll up"
            className="flex items-center justify-center rounded-md border border-neutral-200 dark:border-white/15 py-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => scrollPage(260)}
            aria-label="Scroll down"
            className="flex items-center justify-center rounded-md border border-neutral-200 dark:border-white/15 py-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
