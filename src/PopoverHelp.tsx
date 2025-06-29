import React, { useState, useRef, useEffect } from "react";
import "./PopoverHelp.css"; // Add the CSS below

type PopoverHelpProps = {
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export default function PopoverHelp({ icon = "ℹ️", children }: PopoverHelpProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          cursor: "pointer",
          marginLeft: "0.2em",
          fontSize: "1em",
          userSelect: "none",
        }}
        tabIndex={0}
        aria-label="Show help"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") setOpen(v => !v);
          if (e.key === "Escape") setOpen(false);
        }}
        role="button"
      >
        {icon}
      </span>
      {open && (
        <div className="popover-help-popover">
          {children}
        </div>
      )}
    </span>
  );
}