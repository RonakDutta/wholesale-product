import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft } from "lucide-react";
import ModalShell from "./ModalShell";
import { listHotkeys, prettyCombo } from "../hooks/useHotkey";

/**
 * Type where you want to go, press Enter, you are there.
 *
 * Opened two ways on purpose. Ctrl+K is what anybody who uses software
 * expects, and a visible Search box in the sidebar is how everybody else ever
 * finds out it exists. Users here are traders, not people who read release
 * notes, so a shortcut with no visible way in is a shortcut nobody uses.
 *
 * Matching is deliberately loose. It searches a few keywords per destination
 * as well as its name, so "mill" finds Suppliers and "bill" finds Invoices,
 * because those are the words a wholesaler actually uses for them. It is not
 * fuzzy matching: a substring is enough, and anything cleverer would start
 * ranking things nobody asked for.
 *
 * It lists shortcuts underneath when nothing is typed, which is the answer to
 * "how does anybody discover these": the thing you open to get around is also
 * the thing that tells you the faster way.
 */
const CommandPalette = ({ items, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.label} ${(item.keywords || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const go = (item) => {
    if (!item) return;
    onClose();
    navigate(item.path);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
    // Escape is ModalShell's, so it is not handled here twice.
  };

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const shortcuts = listHotkeys();

  return (
    <ModalShell onClose={onClose} maxWidth="sm:max-w-lg" labelledBy="palette-title">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          id="palette-title"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Back to the top, because the list underneath has just changed
            // and the old highlighted row is not the same row any more.
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Go to customers, suppliers, bills..."
          className="w-full bg-transparent text-sm text-espresso outline-none placeholder:text-slate-400"
        />
      </div>

      <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-500">
            Nothing here called &ldquo;{query}&rdquo;.
          </p>
        ) : (
          results.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                data-index={i}
                onClick={() => go(item)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  i === active
                    ? "bg-clay/10 text-espresso"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {Icon && (
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      i === active ? "text-clay" : "text-slate-400"
                    }`}
                  />
                )}
                <span className="flex-1 font-semibold">{item.label}</span>
                {i === active && (
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
              </button>
            );
          })
        )}

        {/* Only with an empty box. Once he is typing he is going somewhere,
            and a list of shortcuts under the results is just noise. */}
        {!query.trim() && shortcuts.length > 0 && (
          <div className="mt-2 border-t border-slate-100 px-3 pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Shortcuts
            </p>
            <ul className="space-y-1.5">
              {shortcuts.map((s) => (
                <li
                  key={`${s.combo}-${s.label}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="truncate text-slate-500">{s.label}</span>
                  <kbd className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                    {prettyCombo(s.combo)}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default CommandPalette;
