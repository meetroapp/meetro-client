import MeetroIcon from "./MeetroIcon";

function MeetroDetailsButton({
  label = "View request details",
  onClick,
  size = 38,
  disabled = false,
  icon = "requestDetails",
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-sf-symbol="doc.text.fill"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onClick?.(event);
      }}
      style={{
        ...buttonStyle,
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
      }}
    >
      <MeetroIcon name={icon} size={Math.max(18, Math.round(size * 0.52))} decorative />
    </button>
  );
}

const buttonStyle = {
  border: "1px solid rgba(148, 163, 184, 0.38)",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.94)",
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  boxSizing: "border-box",
  boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  flexShrink: 0,
};

export default MeetroDetailsButton;
