"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

interface MatchFilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; detail?: string }[];
  allLabel: string;
  disabled?: boolean;
}

export function MatchFilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  disabled = false,
}: MatchFilterSelectProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const triggerId = `${id}-trigger`;
  const listId = `${id}-options`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tabCloseTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openUpward, setOpenUpward] = useState(false);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = !value
    ? allLabel
    : selectedOption
      ? [selectedOption.label, selectedOption.detail].filter(Boolean).join(" · ")
      : "Unavailable selection";
  const matchingOptions = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return options.filter(
      (option) =>
        option.value !== "" &&
        (!search || `${option.label} ${option.detail || ""}`.toLocaleLowerCase().includes(search)),
    );
  }, [options, query]);
  const visibleOptions = [{ value: "", label: allLabel }, ...matchingOptions];
  const activeId =
    open && activeIndex >= 0 && activeIndex < visibleOptions.length ? `${id}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (!open) return;
    const focusFrame = requestAnimationFrame(() => inputRef.current?.focus());
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  useEffect(() => {
    if (activeId) {
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeId]);

  useEffect(
    () => () => {
      if (tabCloseTimer.current !== null) {
        window.clearTimeout(tabCloseTimer.current);
      }
    },
    [],
  );

  function openPicker(start: "selected" | "last" = "selected") {
    if (disabled) return;
    if (tabCloseTimer.current !== null) {
      window.clearTimeout(tabCloseTimer.current);
      tabCloseTimer.current = null;
    }
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) {
      const spaceBelow = window.innerHeight - bounds.bottom;
      setOpenUpward(spaceBelow < 260 && bounds.top > spaceBelow);
    }
    const choices = [{ value: "", label: allLabel }, ...options.filter((option) => option.value !== "")];
    setQuery("");
    setActiveIndex(start === "last" ? choices.length - 1 : choices.findIndex((option) => option.value === value));
    setOpen(true);
  }

  function closePicker(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function choose(nextValue: string) {
    if (disabled) return;
    onChange(nextValue);
    closePicker(true);
  }

  function handleSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) =>
        index < 0
          ? direction > 0
            ? 0
            : visibleOptions.length - 1
          : Math.max(0, Math.min(visibleOptions.length - 1, index + direction)),
      );
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : visibleOptions.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) choose(option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePicker(true);
    } else if (event.key === "Tab") {
      // Let the browser move focus before removing the search field.
      // Tab and blur never commit a partially typed filter.
      tabCloseTimer.current = window.setTimeout(() => closePicker(), 0);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative min-w-0"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closePicker();
      }}
    >
      <label id={labelId} htmlFor={triggerId} className="mb-1 block text-[13px] font-medium text-fab-muted">
        {label}
      </label>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        aria-controls={open && !disabled ? listId : undefined}
        className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-fab-border bg-fab-surface px-3 py-2 text-left text-sm text-fab-text outline-none transition-colors hover:border-fab-gold/50 focus-visible:border-fab-gold focus-visible:ring-2 focus-visible:ring-fab-gold/40 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:py-1.5"
        onClick={() => (open ? closePicker() : openPicker())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openPicker(event.key === "ArrowUp" ? "last" : "selected");
          }
        }}
      >
        <span id={valueId} className="min-w-0 flex-1 truncate" title={selectedLabel}>
          {selectedLabel}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-fab-dim"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && !disabled && (
        <div
          className={`absolute inset-x-0 z-[60] flex max-h-60 min-w-0 flex-col overflow-hidden rounded-md border border-fab-border bg-fab-surface shadow-xl ${openUpward ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          <div className="shrink-0 border-b border-fab-border p-2">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleSearchKey}
              aria-label={`Search ${label.toLowerCase()}`}
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={activeId}
              autoComplete="off"
              placeholder="Search options…"
              className="min-h-11 w-full min-w-0 rounded border border-fab-border bg-fab-bg px-2.5 py-2 text-base text-fab-text outline-none placeholder:text-fab-dim focus:border-fab-gold focus:ring-1 focus:ring-fab-gold/40 sm:min-h-9 sm:text-sm"
            />
          </div>
          <div
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            className="min-h-0 overflow-y-auto overscroll-contain p-1"
          >
            {visibleOptions.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => choose(option.value)}
                className={`min-h-11 cursor-pointer rounded px-2.5 py-2 text-sm sm:min-h-9 ${index === activeIndex ? "bg-fab-gold/15 text-fab-gold" : "text-fab-text hover:bg-fab-surface-hover"}`}
              >
                <span className="block break-words">{option.label}</span>
                {"detail" in option && option.detail && (
                  <span className="mt-0.5 block break-words text-[13px] text-fab-muted">{option.detail}</span>
                )}
              </div>
            ))}
            {matchingOptions.length === 0 && (
              <p className="px-2.5 py-3 text-sm text-fab-muted" role="status">
                No matching options. Try another search or choose {allLabel.toLowerCase()}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
