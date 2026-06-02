import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface SideNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

interface DashboardSidebarProps {
  items: SideNavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  heading?: string;
  subheading?: string;
}

const EXPANDED_W = 240;
const COLLAPSED_W = 64;

export default function DashboardSidebar({
  items,
  activeTab,
  onTabChange,
  heading,
  subheading,
}: DashboardSidebarProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="
          relative flex-shrink-0 flex flex-col
          bg-card border-r border-border
          min-h-[calc(100vh-4rem)] overflow-hidden
        "
        style={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      >
        {/* ── Header ── */}
        <AnimatePresence initial={false}>
          {expanded && heading && (
            <motion.div
              key="header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1 } }}
              exit={{ opacity: 0 }}
              className="px-5 pt-7 pb-4 border-b border-border"
            >
              <p className="font-display font-semibold text-sm text-foreground truncate leading-tight">
                {heading}
              </p>
              {subheading && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {subheading}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Nav items ── */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={!expanded ? item.label : undefined}
                className={`
                  group relative flex items-center gap-3 w-full rounded-xl
                  transition-all duration-150 text-left
                  ${expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"}
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                {/* Active indicator bar */}
                {/* {isActive && (
                  <motion.span
                    layoutId="sidebar-active-bar"
                    className="flex left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"
                  />
                )} */}

                {/* Icon */}
                <Icon
                  className={`flex-shrink-0 w-4.5 h-4.5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  style={{ width: 18, height: 18 }}
                />

                {/* Label + count */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: 0.06 } }}
                      exit={{ opacity: 0, x: -6, transition: { duration: 0.1 } }}
                      className="flex-1 flex items-center justify-between min-w-0"
                    >
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      {item.count !== undefined && (
                        <span
                          className={`
                            ml-2 flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                            ${isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
                          `}
                        >
                          {item.count}
                        </span>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Collapsed count dot */}
                {!expanded && item.count !== undefined && item.count > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Toggle button ── */}
        <div className="px-2 pb-5 pt-2 border-t border-border">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`
              flex items-center gap-2 w-full rounded-xl px-3 py-2.5
              text-muted-foreground hover:text-foreground hover:bg-muted
              transition-all duration-150
              ${!expanded && "justify-center"}
            `}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <motion.span
              animate={{ rotate: expanded ? 0 : 180 }}
              transition={{ duration: 0.25 }}
              className="flex-shrink-0"
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </motion.span>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  key="collapse-label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.08 } }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
}