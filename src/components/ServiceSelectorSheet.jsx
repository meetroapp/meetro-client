import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getLanguage, t } from "../utils/language";

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function flattenServiceGroups(groups = [], translate = t) {
  return groups.flatMap((group) =>
    (group.options || []).map((option) => {
      const categoryLabel = group.labelKey
        ? translate(group.labelKey)
        : group.label || "";
      const sectionLabel = option.sectionLabelKey
        ? translate(option.sectionLabelKey)
        : option.section || "";

      return {
        ...option,
        categoryLabel,
        groupLabel: sectionLabel || categoryLabel,
        label: option.labelKey
          ? translate(option.labelKey)
          : option.label || option.value,
      };
    })
  );
}

function ServiceSelectorSheet({
  open,
  title,
  subtitle,
  categories = [],
  selectedCategoryId = "",
  categorySearchPlaceholder,
  emptyCategoryText,
  cantFindLabel,
  options = [],
  selectedValues = [],
  searchPlaceholder,
  multiple = false,
  doneLabel,
  doneDisabled = false,
  placement = "bottom",
  onSelect,
  onToggle,
  onDone,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategoryId);
  const [viewport, setViewport] = useState({ height: 0, offsetTop: 0, keyboardInset: 0 });
  const scrollPositionRef = useRef(null);
  const language = getLanguage();

  useEffect(() => {
    if (open) {
      setQuery("");
      setCategoryQuery("");
      setActiveCategoryId(selectedCategoryId);
    }
  }, [open]);

  useEffect(() => {
    setActiveCategoryId(selectedCategoryId);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    scrollPositionRef.current = {
      x: window.scrollX || window.pageXOffset || 0,
      y: window.scrollY || window.pageYOffset || 0,
    };

    const updateViewport = () => {
      const visualViewport = window.visualViewport;
      const layoutHeight =
        window.innerHeight || document.documentElement?.clientHeight || 0;

      if (!visualViewport) {
        setViewport({ height: layoutHeight, offsetTop: 0, keyboardInset: 0 });
        return;
      }

      const keyboardInset = Math.max(
        0,
        Math.round(layoutHeight - visualViewport.height - visualViewport.offsetTop)
      );

      setViewport({
        height: Math.round(visualViewport.height),
        offsetTop: Math.round(visualViewport.offsetTop),
        keyboardInset,
      });
    };

    updateViewport();

    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      const scrollPosition = scrollPositionRef.current;
      if (scrollPosition) {
        window.scrollTo(scrollPosition.x, scrollPosition.y);
      }
    };
  }, [open]);

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const showMultiSelectFooter = Boolean(multiple);
  const categoryMode = categories.length > 0;
  const filteredCategories = useMemo(() => {
    const normalizedQuery = normalizeText(categoryQuery);
    if (!categoryMode || !normalizedQuery) return categories;

    return categories.filter((category) => {
      const haystack = [
        category.label,
        category.id,
        ...(category.aliases || []),
      ].map(normalizeText).join(" ");

      return haystack.includes(normalizedQuery);
    });
  }, [categories, categoryMode, categoryQuery]);
  const visibleOptions = useMemo(() => {
    if (!categoryMode || !activeCategoryId) return options;

    return options.filter((option) => option.categoryId === activeCategoryId);
  }, [activeCategoryId, categoryMode, options]);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return visibleOptions;

    return visibleOptions.filter((option) => {
      const haystack = [
        option.label,
        option.groupLabel,
        option.categoryLabel,
        option.section,
        option.value,
        ...(option.aliases || []),
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(normalizedQuery);
    });
  }, [visibleOptions, query]);
  const groupedOptions = useMemo(() => {
    const groups = [];
    const groupIndexes = new Map();

    filteredOptions.forEach((option) => {
      const groupLabel = option.groupLabel || "";
      const groupKey = groupLabel || "__ungrouped";

      if (!groupIndexes.has(groupKey)) {
        groupIndexes.set(groupKey, groups.length);
        groups.push({
          key: groupKey,
          label: groupLabel,
          options: [],
        });
      }

      groups[groupIndexes.get(groupKey)].options.push(option);
    });

    return groups;
  }, [filteredOptions]);

  if (!open) return null;

  const keyboardOpen = viewport.keyboardInset > 40;
  const visibleHeight = viewport.height || "100dvh";
  const sheetMaxHeight =
    typeof visibleHeight === "number"
      ? `${Math.max(280, visibleHeight - 24)}px`
      : "min(82dvh, 720px)";

  const alignItems =
    placement === "center" || keyboardOpen ? "center" : "flex-end";
  const sheetNode = (
    <div
      style={{
        ...sheetBackdrop,
        alignItems,
        top: viewport.offsetTop || 0,
        height: typeof visibleHeight === "number" ? `${visibleHeight}px` : visibleHeight,
        paddingBottom: keyboardOpen
          ? "max(10px, env(safe-area-inset-bottom))"
          : sheetBackdrop.paddingBottom,
      }}
      role="presentation"
      onClick={onClose}
    >
      <section
        style={{
          ...sheet,
          maxHeight: sheetMaxHeight,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title || t("chooseService", language)}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={sheetHandle} aria-hidden="true" />
        <div style={sheetHeader}>
          <div style={{ minWidth: 0 }}>
            <h2 style={sheetTitle}>{title || t("chooseService", language)}</h2>
            {subtitle && <p style={sheetSubtitle}>{subtitle}</p>}
          </div>
          <button type="button" style={closeButton} onClick={onClose}>
            {t("cancel", language)}
          </button>
        </div>

        <input
          value={categoryMode && !activeCategoryId ? categoryQuery : query}
          onChange={(event) => {
            if (categoryMode && !activeCategoryId) {
              setCategoryQuery(event.target.value);
              return;
            }
            setQuery(event.target.value);
          }}
          placeholder={
            categoryMode && !activeCategoryId
              ? categorySearchPlaceholder || t("professionalCapabilitySearchCategories", language)
              : searchPlaceholder || t("searchServices", language)
          }
          style={searchInput}
        />

        {categoryMode && (
          <div style={categoryChooser}>
            <div style={categoryPillList}>
              {filteredCategories.map((category) => {
                const selected = category.id === activeCategoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    style={{
                      ...categoryPill,
                      ...(selected ? categoryPillSelected : {}),
                    }}
                    aria-pressed={selected}
                    onClick={() => {
                      setActiveCategoryId(category.id);
                      setQuery("");
                      onSelect?.(category.id, category);
                    }}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={optionList}>
          {categoryMode && !activeCategoryId ? (
            <p style={emptySelectionText}>
              {emptyCategoryText || t("professionalCapabilityChooseCategoryEmpty", language)}
            </p>
          ) : (
            groupedOptions.map((group) => (
              <div key={group.key} style={optionGroupSection}>
                {group.label && <div style={categoryHeader}>{group.label}</div>}
                <div style={optionGroupList}>
                  {group.options.map((option) => {
                    const selected = selectedSet.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        style={{
                          ...optionButton,
                          ...(selected ? optionButtonSelected : {}),
                        }}
                        onClick={() => {
                          if (multiple) {
                            onToggle?.(option.value, option);
                          } else {
                            onSelect?.(option.value, option);
                            onClose?.();
                          }
                        }}
                        aria-pressed={selected}
                      >
                        <span style={optionText}>
                          <strong style={optionLabel}>{option.label}</strong>
                        </span>
                        <span style={optionStatus}>{selected ? "✓" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        <p style={cantFindText}>
          {cantFindLabel || t("professionalCapabilityCantFind", language)}
        </p>

        {showMultiSelectFooter && (
          <div style={sheetFooter}>
            <button type="button" style={footerCancelButton} onClick={onClose}>
              {t("cancel", language)}
            </button>
            <button
              type="button"
              style={{
                ...footerDoneButton,
                ...(doneDisabled ? footerDoneButtonDisabled : {}),
              }}
              disabled={doneDisabled}
              onClick={() => {
                onDone?.();
                onClose?.();
              }}
            >
              {doneLabel || t("done", language)}
            </button>
          </div>
        )}
      </section>
    </div>
  );

  if (typeof document === "undefined") return sheetNode;

  return createPortal(sheetNode, document.body);
}

const sheetBackdrop = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1200,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  background: "rgba(15,23,42,0.24)",
  padding:
    "calc(env(safe-area-inset-top) + 12px) max(10px, env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 10px) max(10px, env(safe-area-inset-left))",
  boxSizing: "border-box",
  overflowX: "hidden",
  overflowY: "hidden",
  touchAction: "none",
};

const sheet = {
  width: "min(100%, 620px)",
  maxWidth: "100%",
  maxHeight: "min(82dvh, 720px)",
  minWidth: 0,
  display: "grid",
  gridTemplateRows: "auto auto 1fr auto",
  gap: "12px",
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(31,77,52,0.14)",
  borderRadius: "24px",
  padding: "10px 14px 14px",
  boxShadow: "0 24px 70px rgba(15,23,42,0.22)",
  backdropFilter: "blur(18px)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const sheetHandle = {
  justifySelf: "center",
  width: "48px",
  height: "5px",
  borderRadius: "999px",
  background: "rgba(100,116,139,0.24)",
};

const sheetHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  minWidth: 0,
};

const sheetTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  lineHeight: 1.15,
  fontWeight: 950,
};

const sheetSubtitle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 700,
};

const closeButton = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.8)",
  color: "#475569",
  padding: "9px 12px",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const searchInput = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid rgba(148,163,184,0.30)",
  borderRadius: "16px",
  padding: "13px 14px",
  fontSize: "16px",
  outline: "none",
  color: "#0f172a",
  background: "rgba(255,255,255,0.88)",
};

const optionList = {
  display: "grid",
  gap: "14px",
  overflowY: "auto",
  overscrollBehavior: "contain",
  paddingRight: "2px",
  minHeight: 0,
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-y",
};

const categoryChooser = {
  minWidth: 0,
  overflowX: "auto",
  paddingBottom: "2px",
};

const categoryPillList = {
  display: "flex",
  gap: "8px",
  minWidth: 0,
  overflowX: "auto",
  paddingBottom: "2px",
  WebkitOverflowScrolling: "touch",
};

const categoryPill = {
  flex: "0 0 auto",
  border: "1px solid rgba(31,77,52,0.18)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.86)",
  color: "var(--meetro-color-forest-deep, #14351f)",
  padding: "9px 12px",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const categoryPillSelected = {
  background: "var(--meetro-color-forest-deep, #14351f)",
  color: "var(--meetro-color-paper, #fffdf8)",
  borderColor: "rgba(20,53,31,0.22)",
};

const emptySelectionText = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 750,
};

const cantFindText = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 750,
};

const optionGroupSection = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

const optionGroupList = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

const categoryHeader = {
  padding: "0 4px",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.2,
  fontWeight: 950,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

const optionButton = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.82)",
  color: "#0f172a",
  padding: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  textAlign: "left",
  cursor: "pointer",
};

const optionButtonSelected = {
  borderColor: "rgba(31,77,52,0.22)",
  background: "rgba(31,77,52,0.06)",
};

const optionText = {
  minWidth: 0,
  display: "grid",
  gap: "3px",
};

const optionLabel = {
  fontSize: "15px",
  lineHeight: 1.25,
  fontWeight: 950,
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

const optionStatus = {
  minWidth: "20px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "16px",
  fontWeight: 950,
  textAlign: "center",
};

const sheetFooter = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
  gap: "10px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(226,232,240,0.86)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.96))",
  boxSizing: "border-box",
};

const footerCancelButton = {
  minWidth: 0,
  border: "1px solid rgba(148,163,184,0.32)",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.82)",
  color: "#475569",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 900,
  cursor: "pointer",
};

const footerDoneButton = {
  minWidth: 0,
  border: "1px solid rgba(31,77,52,0.42)",
  borderRadius: "16px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(31,77,52,0.22)",
};

const footerDoneButtonDisabled = {
  opacity: 0.48,
  cursor: "not-allowed",
  boxShadow: "none",
};

export default ServiceSelectorSheet;
