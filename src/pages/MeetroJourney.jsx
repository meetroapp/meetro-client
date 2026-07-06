import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { getLanguage, t } from "../utils/language";

const AUTO_ADVANCE_MS = 4500;
const RESUME_DELAY_MS = 6000;

const JOURNEY_STEPS = [
  "Request",
  "Communication",
  "Schedule",
  "Evaluation",
  "Proposal",
  "Approval",
  "Payment",
  "Work",
  "Completion",
  "History",
];

const SLIDES = [
  {
    icon: "home",
    title: "Start on Home",
    screen: "home",
    activeStep: 0,
    highlight: "Request Service",
    note: "Homeowners begin where they already are: Home. Meetro makes the next action obvious.",
  },
  {
    icon: "requestDetails",
    title: "Request created",
    screen: "myRequests",
    activeStep: 0,
    highlight: "Active request card",
    note: "The request becomes a clean project card with status, next action, and Open Request.",
  },
  {
    icon: "opportunities",
    title: "Professional sees the opportunity",
    screen: "businessDashboard",
    activeStep: 0,
    highlight: "Nearby opportunity",
    note: "Eligible professionals see matching opportunities without mixing unrelated work.",
  },
  {
    icon: "messages",
    title: "Conversation opens",
    screen: "conversation",
    activeStep: 1,
    highlight: "Message thread",
    note: "Both sides use the same conversation layer for questions, photos, and next steps.",
  },
  {
    icon: "schedule",
    title: "Visit scheduled",
    screen: "schedule",
    activeStep: 2,
    highlight: "Schedule card",
    note: "Scheduling becomes a shared source of truth instead of scattered text messages.",
  },
  {
    icon: "evaluationNotes",
    title: "Evaluation notes captured",
    screen: "evaluation",
    activeStep: 3,
    highlight: "Evaluation Notes",
    note: "Photos, measurements, observations, materials, and findings are saved before the proposal.",
  },
  {
    icon: "quote",
    title: "Proposal prepared",
    screen: "quote",
    activeStep: 4,
    highlight: "Quote Builder",
    note: "The proposal connects request, problem found, recommended solution, line items, and total.",
  },
  {
    icon: "selected",
    title: "Customer approval",
    screen: "approval",
    activeStep: 5,
    highlight: "Approve Proposal",
    note: "The homeowner reviews the proposal and approval unlocks the next professional steps.",
  },
  {
    icon: "payment",
    title: "Deposit recorded",
    screen: "payment",
    activeStep: 6,
    highlight: "Payment Summary",
    note: "Payment or deposit evidence is recorded before scheduling work.",
  },
  {
    icon: "workCenter",
    title: "Work Center executes",
    screen: "workCenter",
    activeStep: 7,
    highlight: "Current step",
    note: "The job hub keeps the current action prominent while future steps stay gated.",
  },
  {
    icon: "completion",
    title: "Completion documented",
    screen: "completion",
    activeStep: 8,
    highlight: "Completion Sheet",
    note: "Completion notes, photos, and receipt details become part of the permanent record.",
  },
  {
    icon: "history",
    title: "History stays read-only",
    screen: "history",
    activeStep: 9,
    highlight: "Service History",
    note: "The closed job becomes a shareable, read-only record for both relationship and job history.",
  },
];

function MeetroJourney({ setPage }) {
  const language = getLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimerRef = useRef(null);
  const touchStartXRef = useRef(null);
  const totalSlides = SLIDES.length;
  const activeSlide = SLIDES[activeIndex];

  const progress = useMemo(
    () => Math.round(((activeIndex + 1) / totalSlides) * 100),
    [activeIndex, totalSlides]
  );

  useEffect(() => {
    if (isPaused) return undefined;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % totalSlides);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [isPaused, totalSlides]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const pauseThenResume = () => {
    setIsPaused(true);

    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);

    resumeTimerRef.current = window.setTimeout(() => {
      setIsPaused(false);
    }, RESUME_DELAY_MS);
  };

  const goToSlide = (nextIndex) => {
    pauseThenResume();
    setActiveIndex((nextIndex + totalSlides) % totalSlides);
  };

  const handleReplay = () => {
    pauseThenResume();
    setActiveIndex(0);
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches?.[0]?.clientX;

    if (startX == null || endX == null) return;

    const deltaX = endX - startX;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) < 42) return;

    goToSlide(activeIndex + (deltaX < 0 ? 1 : -1));
  };

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <style>{journeyAnimations}</style>

      <header style={header}>
        <button
          type="button"
          style={backButton}
          onClick={() => setPage("profile")}
        >
          {t("back", language)}
        </button>

        <div style={headerCopy}>
          <p style={eyebrow}>{t("meetroJourneyEyebrow", language)}</p>
          <h1 style={title}>{t("meetroJourneyTitle", language)}</h1>
          <p style={subtitle}>{t("meetroJourneySubtitle", language)}</p>
        </div>
      </header>

      <section
        style={storyShell}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-live="polite"
      >
        <div style={storyTopBar}>
          <div style={slideTitleGroup}>
            <span style={slideIcon}>
              <MeetroIcon name={activeSlide.icon} size={24} decorative />
            </span>
            <div>
              <span style={slideCounter}>
                {activeIndex + 1} / {totalSlides}
              </span>
              <h2 style={slideTitle}>{activeSlide.title}</h2>
            </div>
          </div>

          <span style={autoplayPill}>
            {isPaused
              ? t("meetroJourneyPaused", language)
              : t("meetroJourneyAutoPlaying", language)}
          </span>
        </div>

        <div style={progressTrack} aria-hidden="true">
          <div style={{ ...progressFill, width: `${progress}%` }} />
        </div>

        <div style={screenStage}>
          <MockScreen slide={activeSlide} key={activeSlide.screen} />
          <div style={explanationBubble}>
            <span style={bubbleKicker}>{activeSlide.highlight}</span>
            <p>{activeSlide.note}</p>
          </div>
        </div>

        <div style={timeline}>
          {JOURNEY_STEPS.map((step, index) => {
            const isActive = index === activeSlide.activeStep;
            const isComplete = index < activeSlide.activeStep;

            return (
              <button
                key={step}
                type="button"
                style={{
                  ...timelineDot,
                  ...(isActive ? timelineDotActive : {}),
                  ...(isComplete ? timelineDotComplete : {}),
                }}
                onClick={() => {
                  const matchingSlide = SLIDES.findIndex(
                    (slide) => slide.activeStep === index
                  );
                  goToSlide(matchingSlide >= 0 ? matchingSlide : activeIndex);
                }}
                aria-label={step}
              >
                <span style={timelineDotMark} />
                <span style={timelineLabel}>{step}</span>
              </button>
            );
          })}
        </div>
      </section>

      <footer style={controls}>
        <button
          type="button"
          style={secondaryButton}
          onClick={() => goToSlide(activeIndex - 1)}
        >
          {t("back", language)}
        </button>

        <button type="button" style={secondaryButton} onClick={handleReplay}>
          {t("meetroJourneyReplay", language)}
        </button>

        <button
          type="button"
          style={primaryButton}
          onClick={() => goToSlide(activeIndex + 1)}
        >
          {t("next", language)}
        </button>

        <button
          type="button"
          style={ghostButton}
          onClick={() => setPage("profile")}
        >
          {t("meetroJourneySkipClose", language)}
        </button>
      </footer>

      <BottomNav setPage={setPage} currentPage="profile" />
    </div>
  );
}

function MockScreen({ slide }) {
  return (
    <div style={mockPhone}>
      <div style={mockStatusBar}>
        <span>9:41</span>
        <span>Meetro</span>
      </div>
      {renderScreen(slide.screen)}
    </div>
  );
}

function renderScreen(screen) {
  switch (screen) {
    case "home":
      return <HomeScreenMock />;
    case "myRequests":
      return <RequestsScreenMock />;
    case "businessDashboard":
      return <BusinessDashboardMock />;
    case "conversation":
      return <ConversationMock />;
    case "schedule":
      return <ScheduleMock />;
    case "evaluation":
      return <EvaluationMock />;
    case "quote":
      return <QuoteMock />;
    case "approval":
      return <ApprovalMock />;
    case "payment":
      return <PaymentMock />;
    case "workCenter":
      return <WorkCenterMock />;
    case "completion":
      return <CompletionMock />;
    case "history":
      return <HistoryMock />;
    default:
      return <HomeScreenMock />;
  }
}

function HomeScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Home Dashboard</p>
      <h3 style={mockTitle}>What project can we help with?</h3>
      <div style={spotlightCard}>
        <span style={spotlightIcon}>
          <MeetroIcon name="emergency" size={18} decorative />
        </span>
        <div>
          <strong>Emergency help now</strong>
          <small>Fast help from available professionals.</small>
        </div>
      </div>
      <div style={highlightCard}>
        <span style={highlightRing} />
        <MeetroIcon name="request" size={28} decorative />
        <strong>Request Service</strong>
        <small>Add details, photos, and location.</small>
      </div>
      <MockBottomNav active="Home" />
    </div>
  );
}

function RequestsScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Homeowner Workflow</p>
      <h3 style={mockTitle}>Active Requests</h3>
      <div style={requestCard}>
        <div style={mockRow}>
          <span style={categoryPill}>Door Repair</span>
          <span style={greenPill}>Active</span>
        </div>
        <h4>Replace bifold doors</h4>
        <div style={softStatusBlock}>
          <span>Status</span>
          <strong>Waiting for professional response</strong>
        </div>
        <div style={softStatusBlock}>
          <span>Next Action</span>
          <strong>No action needed right now.</strong>
        </div>
        <button style={mockPrimaryButton}>Open Request</button>
      </div>
    </div>
  );
}

function BusinessDashboardMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Business Dashboard</p>
      <h3 style={mockTitle}>Next Up Today</h3>
      <div style={metricGrid}>
        <MiniMetric label="Leads" value="3" />
        <MiniMetric label="Jobs" value="2" />
      </div>
      <div style={highlightCard}>
        <MeetroIcon name="opportunities" size={26} decorative />
        <strong>New opportunity nearby</strong>
        <small>Door repair · 4 miles away</small>
        <button style={mockPrimaryButton}>Open Opportunity</button>
      </div>
    </div>
  );
}

function ConversationMock() {
  return (
    <div style={mockScreen}>
      <div style={chatHeader}>
        <span style={avatarDot}>S</span>
        <div>
          <strong>Sarah</strong>
          <small>Door repair conversation</small>
        </div>
      </div>
      <div style={messageStack}>
        <span style={leftBubble}>I need help replacing two bifold doors.</span>
        <span style={rightBubble}>I can stop by and measure the opening.</span>
        <span style={leftBubble}>Wednesday works.</span>
      </div>
      <div style={composer}>Message...</div>
    </div>
  );
}

function ScheduleMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Evaluation Schedule</p>
      <h3 style={mockTitle}>Visit Scheduled</h3>
      <div style={requestCard}>
        <div style={mockRow}>
          <span style={categoryPill}>Wed, Jun 24</span>
          <span style={greenPill}>Confirmed</span>
        </div>
        <h4>Estimate Visit</h4>
        <p style={mutedText}>2:30 PM · Sarah Dommerich</p>
        <div style={softStatusBlock}>
          <span>Next Step</span>
          <strong>Attend the scheduled visit.</strong>
        </div>
      </div>
    </div>
  );
}

function EvaluationMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Work Center</p>
      <h3 style={mockTitle}>Evaluation Notes</h3>
      <div style={formCard}>
        <MockField label="Problem Found" value="Door track is damaged." />
        <MockField label="Measurements" value="80 in height · 30 in width" />
        <div style={photoGrid}>
          <span style={photoTile} />
          <span style={photoTile} />
          <span style={photoTile} />
        </div>
        <button style={mockPrimaryButton}>Save Evaluation</button>
      </div>
    </div>
  );
}

function QuoteMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Quote Builder</p>
      <h3 style={mockTitle}>Proposal Summary</h3>
      <div style={formCard}>
        <MockField label="Problem Found" value="Damaged bifold door track." />
        <MockField label="Recommended Solution" value="Replace doors and hardware." />
        <LineItem label="Materials" value="$180" />
        <LineItem label="Labor" value="$260" />
        <LineItem label="Total" value="$440" strong />
      </div>
    </div>
  );
}

function ApprovalMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Project Details</p>
      <h3 style={mockTitle}>Review Proposal</h3>
      <div style={highlightCard}>
        <MeetroIcon name="proposal" size={26} decorative />
        <strong>Proposal Ready</strong>
        <small>Replace bifold doors and hang artwork.</small>
        <LineItem label="Total" value="$440" strong />
        <button style={mockPrimaryButton}>Approve Proposal</button>
      </div>
    </div>
  );
}

function PaymentMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Work Center</p>
      <h3 style={mockTitle}>Payment</h3>
      <div style={formCard}>
        <LineItem label="Proposal total" value="$440" />
        <LineItem label="Deposit" value="$220" strong />
        <div style={softStatusBlock}>
          <span>Status</span>
          <strong>Deposit Paid</strong>
        </div>
        <button style={mockPrimaryButton}>Schedule Work</button>
      </div>
    </div>
  );
}

function WorkCenterMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Sarah Job Hub</p>
      <h3 style={mockTitle}>Active Work</h3>
      <div style={stageRail}>
        {["On The Way", "Arrived", "Start Work"].map((item, index) => (
          <span key={item} style={index === 1 ? activeStagePill : stagePill}>
            {item}
          </span>
        ))}
      </div>
      <div style={highlightCard}>
        <MeetroIcon name="activeWork" size={26} decorative />
        <strong>Current Status</strong>
        <small>Professional arrived. Start work when ready.</small>
        <button style={mockPrimaryButton}>Start Work</button>
      </div>
    </div>
  );
}

function CompletionMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Completion Sheet</p>
      <h3 style={mockTitle}>Complete Work</h3>
      <div style={formCard}>
        <MockField label="Completion Summary" value="Doors installed and adjusted." />
        <div style={photoGrid}>
          <span style={photoTile} />
          <span style={photoTile} />
          <span style={photoTile} />
        </div>
        <button style={mockPrimaryButton}>Create Receipt</button>
      </div>
    </div>
  );
}

function HistoryMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Service History</p>
      <h3 style={mockTitle}>Saved Records</h3>
      <div style={requestCard}>
        <div style={mockRow}>
          <span style={greenPill}>Completed</span>
          <span style={categoryPill}>Paid</span>
        </div>
        <h4>Bifold door replacement</h4>
        <LineItem label="Evaluation" value="Saved" />
        <LineItem label="Proposal" value="$440" />
        <LineItem label="Receipt" value="Ready" />
        <button style={mockPrimaryButton}>View Record</button>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div style={miniMetric}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MockField({ label, value }) {
  return (
    <div style={mockField}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LineItem({ label, value, strong = false }) {
  return (
    <div style={lineItem}>
      <span>{label}</span>
      <strong style={strong ? lineItemStrong : undefined}>{value}</strong>
    </div>
  );
}

function MockBottomNav({ active }) {
  return (
    <div style={mockBottomNav}>
      {["Home", "Discover", "Request", "Messages", "Profile"].map((item) => (
        <span key={item} style={item === active ? mockNavActive : mockNavItem}>
          {item}
        </span>
      ))}
    </div>
  );
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 52px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 116px) max(18px, env(safe-area-inset-left, 0px))",
  overflowX: "hidden",
  overflowY: "auto",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at top left, rgba(91,69,255,0.14), transparent 34%), #f6f8ff",
  color: "#111827",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const journeyAnimations = `
  @keyframes meetroJourneyIn {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const header = {
  width: "100%",
  maxWidth: "1080px",
  margin: "0 auto 18px",
  display: "grid",
  gap: "12px",
};

const backButton = {
  justifySelf: "start",
  border: "1px solid rgba(99,102,241,0.22)",
  borderRadius: "14px",
  padding: "10px 14px",
  background: "#ffffff",
  color: "#312e81",
  fontWeight: 900,
  cursor: "pointer",
};

const headerCopy = {
  minWidth: 0,
};

const eyebrow = {
  margin: "0 0 8px",
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: "0.78rem",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  fontSize: "clamp(2rem, 7vw, 4rem)",
  lineHeight: 1,
  letterSpacing: 0,
};

const subtitle = {
  margin: "12px 0 0",
  color: "#475569",
  fontSize: "1.02rem",
  lineHeight: 1.45,
  maxWidth: "760px",
};

const storyShell = {
  width: "100%",
  maxWidth: "1080px",
  margin: "0 auto",
  border: "1px solid rgba(148,163,184,0.25)",
  borderRadius: "28px",
  padding: "18px",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const storyTopBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const slideTitleGroup = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
};

const slideIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "18px",
  display: "grid",
  placeItems: "center",
  color: "var(--meetro-color-charcoal, #172317)",
  background: "linear-gradient(135deg, var(--meetro-surface-sage, #eef4ea), #ffffff)",
  border: "1px solid rgba(99,102,241,0.18)",
  flex: "0 0 auto",
};

const slideCounter = {
  display: "block",
  color: "#64748b",
  fontSize: "0.82rem",
  fontWeight: 850,
};

const slideTitle = {
  margin: "2px 0 0",
  fontSize: "1.28rem",
  lineHeight: 1.12,
};

const autoplayPill = {
  borderRadius: "999px",
  padding: "8px 11px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: "0.78rem",
  fontWeight: 900,
};

const progressTrack = {
  height: "8px",
  borderRadius: "999px",
  background: "#e2e8f0",
  overflow: "hidden",
  marginBottom: "18px",
};

const progressFill = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, var(--meetro-color-charcoal, #172317), var(--meetro-color-charcoal, #172317))",
  transition: "width 260ms ease",
};

const screenStage = {
  position: "relative",
  width: "100%",
  minHeight: "540px",
  display: "grid",
  placeItems: "center",
  padding: "18px",
  borderRadius: "24px",
  background:
    "linear-gradient(135deg, rgba(238,242,255,0.88), rgba(240,253,250,0.78))",
  boxSizing: "border-box",
};

const mockPhone = {
  width: "min(100%, 430px)",
  minHeight: "500px",
  borderRadius: "34px",
  padding: "12px",
  background: "#0f172a",
  boxShadow: "0 28px 70px rgba(15,23,42,0.34)",
  boxSizing: "border-box",
  animation: "meetroJourneyIn 420ms ease",
};

const mockStatusBar = {
  height: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "#e2e8f0",
  fontSize: "0.72rem",
  fontWeight: 900,
  padding: "0 10px",
};

const mockScreen = {
  minHeight: "456px",
  borderRadius: "26px",
  padding: "18px",
  background: "#f8fafc",
  color: "#0f172a",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  overflow: "hidden",
  boxSizing: "border-box",
};

const mockEyebrow = {
  margin: 0,
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: "0.72rem",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const mockTitle = {
  margin: 0,
  fontSize: "1.55rem",
  lineHeight: 1.05,
  letterSpacing: 0,
};

const spotlightCard = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  borderRadius: "18px",
  padding: "12px",
  color: "#ffffff",
  background: "linear-gradient(135deg, var(--meetro-color-charcoal, #172317), var(--meetro-color-charcoal, #172317))",
  boxShadow: "0 16px 28px rgba(79,70,229,0.22)",
};

const spotlightIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.16)",
};

const highlightCard = {
  position: "relative",
  display: "grid",
  gap: "8px",
  border: "2px solid rgba(79,70,229,0.82)",
  borderRadius: "22px",
  padding: "16px",
  background: "#ffffff",
  boxShadow: "0 18px 36px rgba(79,70,229,0.18)",
  overflow: "hidden",
};

const highlightRing = {
  position: "absolute",
  inset: "8px",
  border: "2px dashed rgba(79,70,229,0.34)",
  borderRadius: "18px",
  pointerEvents: "none",
};

const requestCard = {
  display: "grid",
  gap: "12px",
  borderRadius: "22px",
  padding: "16px",
  background: "#ffffff",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  border: "1px solid rgba(148,163,184,0.22)",
};

const mockRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const categoryPill = {
  borderRadius: "999px",
  padding: "7px 10px",
  color: "var(--meetro-color-charcoal, #172317)",
  background: "var(--meetro-surface-sage, #eef4ea)",
  fontSize: "0.76rem",
  fontWeight: 950,
};

const greenPill = {
  borderRadius: "999px",
  padding: "7px 10px",
  color: "#047857",
  background: "#d1fae5",
  fontSize: "0.76rem",
  fontWeight: 950,
};

const softStatusBlock = {
  display: "grid",
  gap: "4px",
  borderRadius: "16px",
  padding: "12px",
  background: "#f1f5f9",
};

const mutedText = {
  margin: 0,
  color: "#64748b",
  fontSize: "0.92rem",
};

const mockPrimaryButton = {
  border: "none",
  borderRadius: "14px",
  minHeight: "42px",
  padding: "0 14px",
  color: "#ffffff",
  background: "linear-gradient(135deg, var(--meetro-color-charcoal, #172317), var(--meetro-color-charcoal, #172317))",
  fontWeight: 950,
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const miniMetric = {
  display: "grid",
  gap: "4px",
  borderRadius: "18px",
  padding: "14px",
  background: "#ffffff",
  border: "1px solid rgba(148,163,184,0.2)",
};

const chatHeader = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  paddingBottom: "10px",
  borderBottom: "1px solid #e2e8f0",
};

const avatarDot = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  color: "#ffffff",
  background: "var(--meetro-color-charcoal, #172317)",
  fontWeight: 950,
};

const messageStack = {
  display: "grid",
  gap: "10px",
  marginTop: "auto",
};

const leftBubble = {
  justifySelf: "start",
  maxWidth: "82%",
  borderRadius: "18px 18px 18px 6px",
  padding: "11px 12px",
  background: "#e2e8f0",
  fontWeight: 700,
};

const rightBubble = {
  justifySelf: "end",
  maxWidth: "82%",
  borderRadius: "18px 18px 6px 18px",
  padding: "11px 12px",
  color: "#ffffff",
  background: "var(--meetro-color-charcoal, #172317)",
  fontWeight: 700,
};

const composer = {
  marginTop: "auto",
  borderRadius: "18px",
  padding: "13px",
  background: "#ffffff",
  color: "#94a3b8",
  border: "1px solid #e2e8f0",
};

const formCard = {
  display: "grid",
  gap: "10px",
  borderRadius: "22px",
  padding: "16px",
  background: "#ffffff",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
};

const mockField = {
  display: "grid",
  gap: "5px",
  borderRadius: "14px",
  padding: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const photoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "8px",
};

const photoTile = {
  minHeight: "64px",
  borderRadius: "14px",
  background:
    "linear-gradient(135deg, rgba(79,70,229,0.18), rgba(20,184,166,0.16))",
  border: "1px solid rgba(99,102,241,0.18)",
};

const lineItem = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  borderBottom: "1px solid #e2e8f0",
  padding: "8px 0",
};

const lineItemStrong = {
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: "1.05rem",
};

const stageRail = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
};

const stagePill = {
  flex: "0 0 auto",
  borderRadius: "999px",
  padding: "8px 10px",
  color: "#64748b",
  background: "#e2e8f0",
  fontWeight: 900,
  fontSize: "0.8rem",
};

const activeStagePill = {
  ...stagePill,
  color: "#ffffff",
  background: "var(--meetro-color-charcoal, #172317)",
};

const mockBottomNav = {
  marginTop: "auto",
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "4px",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "10px",
};

const mockNavItem = {
  textAlign: "center",
  color: "#64748b",
  fontSize: "0.66rem",
  fontWeight: 850,
};

const mockNavActive = {
  ...mockNavItem,
  color: "var(--meetro-color-charcoal, #172317)",
};

const explanationBubble = {
  position: "absolute",
  right: "max(16px, 4%)",
  bottom: "24px",
  width: "min(330px, calc(100% - 32px))",
  borderRadius: "22px",
  padding: "16px",
  background: "rgba(255,255,255,0.94)",
  boxShadow: "0 18px 44px rgba(15,23,42,0.18)",
  border: "1px solid rgba(99,102,241,0.18)",
  boxSizing: "border-box",
};

const bubbleKicker = {
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: "0.72rem",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const timeline = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  padding: "18px 2px 4px",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
};

const timelineDot = {
  border: "none",
  background: "transparent",
  padding: "0",
  minWidth: "86px",
  maxWidth: "120px",
  cursor: "pointer",
  color: "#64748b",
  display: "grid",
  gap: "7px",
  justifyItems: "center",
  scrollSnapAlign: "start",
};

const timelineDotActive = {
  color: "var(--meetro-color-charcoal, #172317)",
};

const timelineDotComplete = {
  color: "#0f766e",
};

const timelineDotMark = {
  width: "14px",
  height: "14px",
  borderRadius: "999px",
  background: "currentColor",
  boxShadow: "0 0 0 5px rgba(79,70,229,0.09)",
};

const timelineLabel = {
  fontSize: "0.72rem",
  fontWeight: 850,
  textAlign: "center",
  lineHeight: 1.15,
};

const controls = {
  width: "100%",
  maxWidth: "1080px",
  margin: "16px auto 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
  gap: "10px",
};

const buttonBase = {
  minHeight: "48px",
  borderRadius: "16px",
  fontWeight: 950,
  cursor: "pointer",
  fontSize: "0.95rem",
};

const secondaryButton = {
  ...buttonBase,
  border: "1px solid rgba(99,102,241,0.22)",
  background: "#ffffff",
  color: "#312e81",
};

const primaryButton = {
  ...buttonBase,
  border: "1px solid transparent",
  background: "linear-gradient(135deg, var(--meetro-color-charcoal, #172317), var(--meetro-color-charcoal, #172317))",
  color: "#ffffff",
  boxShadow: "0 14px 26px rgba(79,70,229,0.22)",
};

const ghostButton = {
  ...buttonBase,
  border: "1px solid rgba(148,163,184,0.25)",
  background: "rgba(255,255,255,0.72)",
  color: "#475569",
};

export default MeetroJourney;
