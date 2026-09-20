import MeetroIcon from "./MeetroIcon.jsx";
import { getWorkCenterSource, getWorkCenterSourceCopy, filterWorkCenterSources } from "../utils/workCenterSourcePresentation.js";
import "./WorkCenterSource.css";

export function WorkCenterSourceBadge({ record, language = "en" }) {
  const source = getWorkCenterSource(record);
  const copy = getWorkCenterSourceCopy(language);
  if (source === "unknown") return null;
  return <span className={`work-center-source-badge work-center-source-badge--${source}`} data-job-source={source}>
    <MeetroIcon name={source === "emergency" ? "emergency" : "requestDetails"} size={16} decorative />
    {source === "request" ? copy.requestBadge : copy[source]}
  </span>;
}

export function WorkCenterSourceFilter({ records = [], value = "all", onChange, language = "en" }) {
  const copy = getWorkCenterSourceCopy(language);
  return <div className="work-center-source-filter" role="group" aria-label={copy.label}>
    {["all", "request", "emergency"].map((source) => <button key={source} type="button"
      aria-pressed={value === source} onClick={() => onChange(source)}>
      {copy[source]} <span>({filterWorkCenterSources(records, source).length})</span>
    </button>)}
  </div>;
}
