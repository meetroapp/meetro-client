import { useEffect, useMemo, useRef, useState } from "react";
import MeetroIcon from "../components/MeetroIcon";
import { t } from "../utils/language";

const AUTO_ADVANCE_MS = 4200;
const RESUME_DELAY_MS = 5200;

const STORY_STEPS = [
  "Request",
  "Messages",
  "Schedule",
  "Evaluation",
  "Proposal",
  "Approval",
  "Payment",
  "Work",
  "Completion",
  "History",
];

const STORY_SLIDES = [
  {
    id: "home",
    icon: "home",
    screen: "home",
    eyebrow: "Homeowner problem",
    title: "A homeowner needs help.",
    headline: "Meetro starts where the customer starts: Home.",
    highlight: "Request Service",
    note: "The first action is obvious: describe the job, add context, and start the request.",
    activeStep: 0,
  },
  {
    id: "request",
    icon: "requestDetails",
    screen: "request",
    eyebrow: "Request",
    title: "The need becomes a clean request.",
    headline: "Photos, category, status, and next action turn uncertainty into a trackable project.",
    highlight: "Active Request card",
    note: "This mirrors the homeowner Active Requests pattern: what it is, current status, next action, and Open Request.",
    activeStep: 0,
  },
  {
    id: "opportunity",
    icon: "opportunities",
    screen: "businessDashboard",
    eyebrow: "Professional opportunity",
    title: "The right professional sees the right work.",
    headline: "The business side receives an eligible local opportunity without mixing unrelated domains.",
    highlight: "Opportunity card",
    note: "The same dashboard language professionals use later becomes the first business-side signal.",
    activeStep: 0,
  },
  {
    id: "messages",
    icon: "messages",
    screen: "conversation",
    eyebrow: "Communication",
    title: "Both sides get aligned.",
    headline: "Questions, photos, timing, and expectations stay in one Meetro thread.",
    highlight: "ConversationThread",
    note: "The thread looks like the actual Messages experience, not a generic chat mock.",
    activeStep: 1,
  },
  {
    id: "schedule",
    icon: "schedule",
    screen: "schedule",
    eyebrow: "Schedule",
    title: "The visit gets confirmed.",
    headline: "The appointment becomes a shared record for homeowner and professional.",
    highlight: "Evaluation Schedule",
    note: "The schedule card shows status, next step, time, and customer context.",
    activeStep: 2,
  },
  {
    id: "evaluation",
    icon: "evaluationNotes",
    screen: "evaluation",
    eyebrow: "Evaluation",
    title: "The professional documents the real work.",
    headline: "Measurements, photos, materials, findings, and recommendations become structured records.",
    highlight: "Evaluation Notes",
    note: "Evaluation comes before proposal so the quote has a real source of truth.",
    activeStep: 3,
  },
  {
    id: "proposal",
    icon: "quote",
    screen: "quote",
    eyebrow: "Proposal",
    title: "A clear proposal is created.",
    headline: "Problem found, recommended solution, line items, terms, and total stay connected.",
    highlight: "Quote Builder",
    note: "This uses the same Quote Builder structure customers and professionals will see.",
    activeStep: 4,
  },
  {
    id: "approval",
    icon: "selected",
    screen: "approval",
    eyebrow: "Approval",
    title: "The homeowner approves with confidence.",
    headline: "The customer sees scope, price, and terms before the workflow moves forward.",
    highlight: "Approve Proposal",
    note: "Approval is a visible gate, not a hidden assumption.",
    activeStep: 5,
  },
  {
    id: "payment",
    icon: "payment",
    screen: "payment",
    eyebrow: "Payment",
    title: "Payment evidence unlocks the next step.",
    headline: "Deposit or payment status is recorded before work is scheduled.",
    highlight: "Payment Summary",
    note: "Meetro keeps trust, proposal, and payment in one connected flow.",
    activeStep: 6,
  },
  {
    id: "work",
    icon: "workCenter",
    screen: "activeWork",
    eyebrow: "Active Work",
    title: "The work day is visible.",
    headline: "On The Way, Arrived, Start Work, and Complete Work keep everyone oriented.",
    highlight: "Work Center job hub",
    note: "The professional sees the current action while future steps stay out of the way.",
    activeStep: 7,
  },
  {
    id: "completion",
    icon: "completion",
    screen: "completion",
    eyebrow: "Completion",
    title: "Finished work becomes documentation.",
    headline: "Completion notes, photos, receipt, and customer review become part of the record.",
    highlight: "Completion Sheet",
    note: "Completion is more than a button. It captures proof and prepares history.",
    activeStep: 8,
  },
  {
    id: "history",
    icon: "history",
    screen: "history",
    eyebrow: "History",
    title: "The relationship remembers.",
    headline: "Closed work becomes service history, business memory, and future insight.",
    highlight: "Job History",
    note: "Jobs end. Relationships, reviews, assets, and records keep building.",
    activeStep: 9,
  },
  {
    id: "emergency",
    icon: "emergency",
    screen: "emergency",
    eyebrow: "Emergency journey",
    title: "Urgent work gets a faster lane.",
    headline: "Emergency request, dispatch, live status, and resolution stay separate from normal work.",
    highlight: "Live Emergency View",
    note: "Emergency has its own visual urgency while still preserving a record.",
    activeStep: 7,
  },
  {
    id: "future",
    icon: "hiringCenter",
    screen: "future",
    eyebrow: "Future journey",
    title: "The workflow becomes a marketplace.",
    headline: "Hiring, property management, and community services grow from the same trusted foundation.",
    highlight: "Business Tools + Discover",
    note: "Meetro begins with work, then becomes the local services layer.",
    activeStep: 9,
  },
];

function MeetroStory({ setPage }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimerRef = useRef(null);
  const touchStartXRef = useRef(null);
  const totalSlides = STORY_SLIDES.length;
  const activeSlide = STORY_SLIDES[activeIndex];
  const progress = useMemo(
    () => Math.round(((activeIndex + 1) / totalSlides) * 100),
    [activeIndex, totalSlides]
  );

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % totalSlides);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
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

  const handleClose = () => {
    setPage(localStorage.getItem("token") ? "profile" : "login");
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches?.[0]?.clientX;

    if (startX == null || endX == null) return;

    const delta = endX - startX;
    touchStartXRef.current = null;

    if (Math.abs(delta) > 44) {
      goToSlide(activeIndex + (delta < 0 ? 1 : -1));
    }
  };

  return (
    <main style={pageShell} className="meetro-responsive-page">
      <style>{storyAnimations}</style>

      <header style={heroShell}>
        <div style={topBar}>
          <div style={heroCopy}>
            <p style={eyebrow}>{t("meetroStoryTitle")}</p>
            <h1 style={title}>Watch Meetro move the work.</h1>
            <p style={subtitle}>{t("meetroStorySubtitle")}</p>
          </div>

          <button type="button" style={skipButton} onClick={handleClose}>
            Skip / Close
          </button>
        </div>

        <div style={progressTrack} aria-label={`Story progress ${progress}%`}>
          <div style={{ ...progressFill, width: `${progress}%` }} />
        </div>
      </header>

      <section
        key={activeSlide.id}
        style={storyShell}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-live="polite"
      >
        <div style={slideIntro}>
          <span style={slideIcon}>
            <MeetroIcon name={activeSlide.icon} size={24} decorative />
          </span>
          <div>
            <p style={slideEyebrow}>{activeSlide.eyebrow}</p>
            <h2 style={slideTitle}>{activeSlide.title}</h2>
            <p style={slideHeadline}>{activeSlide.headline}</p>
          </div>
        </div>

        <div style={screenStage} className="meetro-story-screen-stage">
          <MockScreen slide={activeSlide} />

          <aside style={explanationBubble}>
            <span style={bubbleKicker}>{activeSlide.highlight}</span>
            <p>{activeSlide.note}</p>
          </aside>
        </div>

        <WorkflowTimeline activeStep={activeSlide.activeStep} />
      </section>

      <footer style={controls} className="meetro-story-controls">
        <button
          type="button"
          style={secondaryButton}
          onClick={() => goToSlide(activeIndex - 1)}
        >
          Back
        </button>

        <div style={dots} aria-label="Story slides">
          {STORY_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to story slide ${index + 1}`}
              style={{
                ...dot,
                ...(index === activeIndex ? activeDot : {}),
              }}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>

        <button type="button" style={secondaryButton} onClick={handleReplay}>
          Replay
        </button>

        <button
          type="button"
          style={primaryButton}
          onClick={() => goToSlide(activeIndex + 1)}
        >
          Next
        </button>
      </footer>
    </main>
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
    case "request":
      return <RequestScreenMock />;
    case "businessDashboard":
      return <BusinessDashboardMock />;
    case "conversation":
      return <ConversationScreenMock />;
    case "schedule":
      return <ScheduleScreenMock />;
    case "evaluation":
      return <EvaluationScreenMock />;
    case "quote":
      return <QuoteScreenMock />;
    case "approval":
      return <ApprovalScreenMock />;
    case "payment":
      return <PaymentScreenMock />;
    case "activeWork":
      return <ActiveWorkScreenMock />;
    case "completion":
      return <CompletionScreenMock />;
    case "history":
      return <HistoryScreenMock />;
    case "emergency":
      return <EmergencyScreenMock />;
    case "future":
      return <FutureScreenMock />;
    default:
      return <HomeScreenMock />;
  }
}

function HomeScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Home Dashboard</p>
      <h3 style={mockTitle}>How can we help today?</h3>
      <div style={emergencyBanner}>
        <MeetroIcon name="emergency" size={20} decorative />
        <div>
          <strong>Emergency help now</strong>
          <span>Fast help from available professionals.</span>
        </div>
      </div>
      <div style={featuredAction}>
        <span style={highlightRing} />
        <MeetroIcon name="request" size={30} decorative />
        <strong>Request Service</strong>
        <span>Add photos, notes, location, and timing.</span>
      </div>
      <MockBottomNav active="Home" />
    </div>
  );
}

function RequestScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Homeowner Workflow</p>
      <div style={mockTitleRow}>
        <h3 style={mockTitle}>Active Requests</h3>
        <span style={linkText}>View All</span>
      </div>
      <div style={requestCard}>
        <div style={mockRow}>
          <span style={categoryPill}>Door Repair</span>
          <span style={greenPill}>Active</span>
        </div>
        <h4 style={cardTitle}>Replace bifold doors</h4>
        <div style={statusBlock}>
          <span>Status</span>
          <strong>Waiting for professional response</strong>
        </div>
        <div style={statusBlock}>
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
      <h3 style={mockTitle}>Run the day</h3>
      <div style={metricGrid}>
        <MiniMetric label="Leads" value="3" />
        <MiniMetric label="Jobs" value="2" />
        <MiniMetric label="Revenue" value="$440" />
      </div>
      <div style={opportunityCard}>
        <div style={mockRow}>
          <span style={categoryPill}>Opportunity</span>
          <span style={greenPill}>Nearby</span>
        </div>
        <h4 style={cardTitle}>Door repair request</h4>
        <p style={mutedText}>4 miles away · matches service area</p>
        <button style={mockPrimaryButton}>Open Opportunity</button>
      </div>
    </div>
  );
}

function ConversationScreenMock() {
  return (
    <div style={mockScreen}>
      <div style={threadHeader}>
        <span style={avatarDot}>S</span>
        <div>
          <strong>Sarah Dommerich</strong>
          <span>Door repair conversation</span>
        </div>
      </div>
      <div style={messageStack}>
        <span style={leftBubble}>I need help replacing two bifold doors.</span>
        <span style={rightBubble}>I can stop by and measure the opening.</span>
        <span style={leftBubble}>Wednesday afternoon works.</span>
      </div>
      <div style={composer}>Message...</div>
    </div>
  );
}

function ScheduleScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Evaluation Schedule</p>
      <h3 style={mockTitle}>Visit Scheduled</h3>
      <div style={requestCard}>
        <div style={mockRow}>
          <span style={categoryPill}>Wed, Jun 24</span>
          <span style={greenPill}>Confirmed</span>
        </div>
        <h4 style={cardTitle}>Scheduled Estimate Visit</h4>
        <p style={mutedText}>2:30 PM · Sarah Dommerich</p>
        <div style={statusBlock}>
          <span>Next Step</span>
          <strong>Attend the scheduled visit.</strong>
        </div>
        <button style={mockSecondaryButton}>Edit Visit</button>
      </div>
    </div>
  );
}

function EvaluationScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Work Center</p>
      <h3 style={mockTitle}>Evaluation Notes</h3>
      <div style={formCard}>
        <MockField label="Problem Found" value="Door track is damaged." />
        <MockField label="Measurements" value="80 in height · 30 in width" />
        <MockField label="Materials Needed" value="Doors, hinges, hardware" />
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

function QuoteScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Quote Builder</p>
      <h3 style={mockTitle}>Proposal Summary</h3>
      <div style={formCard}>
        <MockField label="Customer Request" value="Replace bifold doors" />
        <MockField label="Recommended Solution" value="Install new doors and hardware" />
        <LineItem label="Materials" value="$180" />
        <LineItem label="Labor" value="$260" />
        <LineItem label="Total" value="$440" strong />
      </div>
    </div>
  );
}

function ApprovalScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Project Details</p>
      <h3 style={mockTitle}>Review Proposal</h3>
      <div style={proposalCard}>
        <MeetroIcon name="proposal" size={26} decorative />
        <h4 style={cardTitle}>Door replacement proposal</h4>
        <p style={mutedText}>Includes materials, labor, terms, and timeline.</p>
        <LineItem label="Total" value="$440" strong />
        <button style={mockPrimaryButton}>Approve Proposal</button>
      </div>
    </div>
  );
}

function PaymentScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Work Center</p>
      <h3 style={mockTitle}>Payment</h3>
      <div style={formCard}>
        <LineItem label="Proposal total" value="$440" />
        <LineItem label="Deposit received" value="$220" strong />
        <div style={statusBlock}>
          <span>Status</span>
          <strong>Deposit Paid</strong>
        </div>
        <button style={mockPrimaryButton}>Schedule Work</button>
      </div>
    </div>
  );
}

function ActiveWorkScreenMock() {
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
      <div style={opportunityCard}>
        <MeetroIcon name="activeWork" size={26} decorative />
        <h4 style={cardTitle}>Current Status</h4>
        <p style={mutedText}>Professional arrived. Start work when ready.</p>
        <button style={mockPrimaryButton}>Start Work</button>
      </div>
    </div>
  );
}

function CompletionScreenMock() {
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
        <LineItem label="Receipt" value="Ready" />
        <button style={mockPrimaryButton}>Close Job</button>
      </div>
    </div>
  );
}

function HistoryScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Job History</p>
      <h3 style={mockTitle}>Closed Records</h3>
      <div style={requestCard}>
        <div style={mockRow}>
          <span style={greenPill}>Completed</span>
          <span style={categoryPill}>Paid</span>
        </div>
        <h4 style={cardTitle}>Bifold door replacement</h4>
        <LineItem label="Evaluation" value="Saved" />
        <LineItem label="Proposal" value="$440" />
        <LineItem label="Receipt" value="Ready" />
        <button style={mockPrimaryButton}>View Record</button>
      </div>
    </div>
  );
}

function EmergencyScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={{ ...mockEyebrow, color: "#dc2626" }}>Live Emergency View</p>
      <h3 style={mockTitle}>On the Way</h3>
      <div style={emergencyRoute}>
        <strong>Professional → Customer</strong>
        <span>ETA 10m</span>
        <div style={routeLine}>
          <span />
          <i />
          <span />
        </div>
      </div>
      <button style={mockPrimaryButton}>Mark Arrived</button>
    </div>
  );
}

function FutureScreenMock() {
  return (
    <div style={mockScreen}>
      <p style={mockEyebrow}>Future Meetro</p>
      <h3 style={mockTitle}>More local service layers</h3>
      <div style={futureGrid}>
        <FutureTile icon="hiringCenter" title="Hiring" />
        <FutureTile icon="assetCenter" title="Properties" />
        <FutureTile icon="discover" title="Marketplace" />
      </div>
      <div style={statusBlock}>
        <span>Foundation</span>
        <strong>Relationships → Work → History → Intelligence</strong>
      </div>
    </div>
  );
}

function WorkflowTimeline({ activeStep }) {
  return (
    <div style={timeline}>
      {STORY_STEPS.map((step, index) => {
        const isActive = index === activeStep;
        const isComplete = index < activeStep;

        return (
          <span
            key={step}
            style={{
              ...timelinePill,
              ...(isComplete ? timelineComplete : {}),
              ...(isActive ? timelineActive : {}),
            }}
          >
            {step}
          </span>
        );
      })}
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

function FutureTile({ icon, title }) {
  return (
    <div style={futureTile}>
      <MeetroIcon name={icon} size={22} decorative />
      <strong>{title}</strong>
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

const pageShell = {
  minHeight: "100dvh",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  overflowX: "hidden",
  padding:
    "calc(env(safe-area-inset-top) + 18px) 16px calc(env(safe-area-inset-bottom) + 28px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(88, 55, 245, 0.16), transparent 34%), linear-gradient(180deg, #fbfbff 0%, #f5f7fb 100%)",
  color: "#101828",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

const heroShell = {
  maxWidth: 1120,
  margin: "0 auto 18px",
};

const topBar = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const heroCopy = {
  minWidth: 0,
};

const eyebrow = {
  margin: "0 0 8px",
  color: "#4f46e5",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 1.6,
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  fontSize: "clamp(34px, 7vw, 62px)",
  lineHeight: 0.98,
  letterSpacing: 0,
  maxWidth: 780,
};

const subtitle = {
  margin: "14px 0 18px",
  maxWidth: 760,
  color: "#526179",
  fontSize: "clamp(16px, 3.8vw, 21px)",
  lineHeight: 1.35,
};

const progressTrack = {
  height: 8,
  borderRadius: 999,
  background: "#e5e7f5",
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #5837f5, #2563eb)",
  transition: "width 280ms ease",
};

const storyShell = {
  maxWidth: 1120,
  margin: "0 auto",
  border: "1px solid rgba(148, 163, 184, 0.32)",
  borderRadius: 28,
  background: "rgba(255, 255, 255, 0.9)",
  boxShadow: "0 28px 80px rgba(15, 23, 42, 0.12)",
  padding: "clamp(16px, 4vw, 28px)",
  animation: "meetroStoryIn 420ms ease both",
  overflow: "hidden",
};

const slideIntro = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 18,
};

const slideIcon = {
  width: 48,
  height: 48,
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  color: "#4f46e5",
  background: "linear-gradient(135deg, #eef2ff, #ffffff)",
  border: "1px solid rgba(99, 102, 241, 0.18)",
  flex: "0 0 auto",
};

const slideEyebrow = {
  ...eyebrow,
  marginBottom: 4,
  color: "#111827",
};

const slideTitle = {
  margin: "0 0 6px",
  fontSize: "clamp(25px, 5.8vw, 44px)",
  lineHeight: 1.04,
  letterSpacing: 0,
};

const slideHeadline = {
  margin: 0,
  color: "#526179",
  fontSize: "clamp(15px, 3.6vw, 20px)",
  lineHeight: 1.35,
  maxWidth: 820,
};

const screenStage = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 430px) minmax(240px, 1fr)",
  gap: 18,
  alignItems: "center",
};

const mockPhone = {
  width: "100%",
  maxWidth: 430,
  minWidth: 0,
  justifySelf: "center",
  borderRadius: 32,
  padding: 12,
  background: "#111827",
  boxShadow: "0 26px 70px rgba(15, 23, 42, 0.22)",
  boxSizing: "border-box",
};

const mockStatusBar = {
  display: "flex",
  justifyContent: "space-between",
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
  padding: "5px 10px 10px",
};

const mockScreen = {
  minHeight: 520,
  borderRadius: 24,
  padding: 18,
  background: "linear-gradient(180deg, #fbfbff, #f3f5fb)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const mockEyebrow = {
  margin: "0 0 8px",
  color: "#4f46e5",
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1.1,
  textTransform: "uppercase",
};

const mockTitle = {
  margin: "0 0 16px",
  fontSize: 28,
  lineHeight: 1.05,
  letterSpacing: 0,
};

const mockTitleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 10,
};

const linkText = {
  color: "#5837f5",
  fontSize: 14,
  fontWeight: 900,
};

const emergencyBanner = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 20,
  color: "#fff",
  background: "linear-gradient(135deg, #5837f5, #8b5cf6)",
  boxShadow: "0 18px 34px rgba(88, 55, 245, 0.24)",
  marginBottom: 16,
};

const featuredAction = {
  position: "relative",
  display: "grid",
  gap: 8,
  placeItems: "center",
  minHeight: 230,
  borderRadius: 24,
  padding: 20,
  color: "#312e81",
  background: "#fff",
  border: "2px solid rgba(88, 55, 245, 0.18)",
  boxShadow: "0 18px 38px rgba(15, 23, 42, 0.1)",
  textAlign: "center",
};

const highlightRing = {
  position: "absolute",
  inset: 12,
  borderRadius: 20,
  border: "2px dashed rgba(88, 55, 245, 0.36)",
  animation: "meetroStoryPulse 1.8s ease-in-out infinite",
};

const requestCard = {
  borderRadius: 22,
  padding: 16,
  background: "#fff",
  border: "1px solid #e8eaf3",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
};

const opportunityCard = {
  ...requestCard,
  border: "2px solid rgba(88, 55, 245, 0.16)",
};

const proposalCard = {
  ...requestCard,
  display: "grid",
  gap: 10,
};

const mockRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  marginBottom: 12,
};

const categoryPill = {
  borderRadius: 999,
  padding: "7px 10px",
  background: "#f1edff",
  color: "#5837f5",
  fontSize: 13,
  fontWeight: 900,
};

const greenPill = {
  ...categoryPill,
  background: "#ecfdf5",
  color: "#047857",
};

const cardTitle = {
  margin: "0 0 10px",
  fontSize: 21,
  lineHeight: 1.12,
};

const mutedText = {
  margin: "0 0 12px",
  color: "#667085",
  fontSize: 14,
  lineHeight: 1.35,
  fontWeight: 650,
};

const statusBlock = {
  display: "grid",
  gap: 4,
  padding: 12,
  borderRadius: 15,
  background: "#f7f7ff",
  marginBottom: 10,
};

const mockPrimaryButton = {
  width: "100%",
  minHeight: 44,
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #5837f5, #312eeb)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 900,
};

const mockSecondaryButton = {
  ...mockPrimaryButton,
  background: "#fff",
  color: "#5837f5",
  border: "1px solid #ddd6fe",
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 14,
};

const miniMetric = {
  display: "grid",
  gap: 2,
  padding: 10,
  borderRadius: 15,
  background: "#fff",
  border: "1px solid #e8eaf3",
};

const threadHeader = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  paddingBottom: 14,
  borderBottom: "1px solid #e5e7eb",
  marginBottom: 18,
};

const avatarDot = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "#5837f5",
  color: "#fff",
  fontWeight: 900,
};

const messageStack = {
  display: "grid",
  gap: 12,
  alignContent: "start",
  minHeight: 330,
};

const leftBubble = {
  justifySelf: "start",
  maxWidth: "80%",
  borderRadius: "18px 18px 18px 6px",
  padding: "12px 14px",
  background: "#fff",
  color: "#1f2937",
  fontWeight: 760,
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
};

const rightBubble = {
  ...leftBubble,
  justifySelf: "end",
  borderRadius: "18px 18px 6px 18px",
  background: "#5837f5",
  color: "#fff",
};

const composer = {
  marginTop: 16,
  borderRadius: 18,
  padding: 13,
  background: "#fff",
  border: "1px solid #e5e7eb",
  color: "#98a2b3",
};

const formCard = {
  ...requestCard,
  display: "grid",
  gap: 10,
};

const mockField = {
  display: "grid",
  gap: 4,
  padding: 12,
  borderRadius: 14,
  background: "#f8fafc",
};

const photoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
};

const photoTile = {
  minHeight: 72,
  borderRadius: 14,
  background:
    "linear-gradient(135deg, rgba(88,55,245,0.14), rgba(14,165,233,0.18))",
  border: "1px solid rgba(88, 55, 245, 0.12)",
};

const lineItem = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 0",
  borderBottom: "1px solid #edf0f7",
  color: "#475467",
};

const lineItemStrong = {
  color: "#101828",
  fontSize: 18,
};

const stageRail = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  marginBottom: 14,
};

const stagePill = {
  flex: "0 0 auto",
  borderRadius: 999,
  padding: "9px 11px",
  background: "#fff",
  color: "#667085",
  border: "1px solid #e5e7eb",
  fontSize: 13,
  fontWeight: 900,
};

const activeStagePill = {
  ...stagePill,
  color: "#fff",
  background: "#5837f5",
  borderColor: "#5837f5",
};

const emergencyRoute = {
  display: "grid",
  gap: 14,
  padding: 16,
  borderRadius: 22,
  background: "#fff7f7",
  border: "1px solid #fecaca",
  marginBottom: 14,
};

const routeLine = {
  display: "grid",
  gridTemplateColumns: "22px 1fr 22px",
  alignItems: "center",
  gap: 8,
  minHeight: 110,
};

const futureGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
  marginBottom: 14,
};

const futureTile = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 14,
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #e5e7eb",
  color: "#312e81",
};

const mockBottomNav = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 4,
  marginTop: 18,
  padding: 8,
  borderRadius: 18,
  background: "#fff",
  boxShadow: "0 -4px 18px rgba(15, 23, 42, 0.06)",
};

const mockNavItem = {
  fontSize: 10,
  color: "#667085",
  textAlign: "center",
  fontWeight: 800,
};

const mockNavActive = {
  ...mockNavItem,
  color: "#5837f5",
  background: "#f0edff",
  borderRadius: 12,
  padding: "7px 2px",
};

const explanationBubble = {
  position: "relative",
  borderRadius: 24,
  padding: "clamp(18px, 4vw, 30px)",
  color: "#fff",
  background:
    "radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 40%), linear-gradient(135deg, #111827, #312e81)",
  boxShadow: "0 18px 42px rgba(15, 23, 42, 0.2)",
};

const bubbleKicker = {
  display: "inline-flex",
  marginBottom: 12,
  borderRadius: 999,
  padding: "8px 11px",
  background: "rgba(255,255,255,0.14)",
  color: "#c7d2fe",
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1.1,
  textTransform: "uppercase",
};

const timeline = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingTop: 18,
  marginTop: 18,
  borderTop: "1px solid #e5e7eb",
};

const timelinePill = {
  flex: "0 0 auto",
  borderRadius: 999,
  padding: "8px 10px",
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
};

const timelineComplete = {
  background: "#ede9fe",
  color: "#5837f5",
};

const timelineActive = {
  background: "#5837f5",
  color: "#fff",
  boxShadow: "0 10px 24px rgba(88, 55, 245, 0.22)",
};

const controls = {
  position: "sticky",
  bottom: 0,
  zIndex: 10,
  maxWidth: 1120,
  margin: "18px auto 0",
  display: "grid",
  gridTemplateColumns: "auto 1fr auto auto",
  gap: 10,
  alignItems: "center",
  padding: "12px 0 calc(env(safe-area-inset-bottom) + 4px)",
  background:
    "linear-gradient(180deg, rgba(245, 247, 251, 0), rgba(245, 247, 251, 0.96) 28%)",
};

const dots = {
  display: "flex",
  gap: 6,
  justifyContent: "center",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

const dot = {
  width: 9,
  height: 9,
  borderRadius: 999,
  border: "none",
  background: "#cbd5e1",
  padding: 0,
  flex: "0 0 auto",
};

const activeDot = {
  width: 26,
  background: "#5837f5",
};

const baseButton = {
  minHeight: 46,
  borderRadius: 14,
  border: "none",
  padding: "0 16px",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const primaryButton = {
  ...baseButton,
  color: "#fff",
  background: "linear-gradient(135deg, #5837f5, #312eeb)",
};

const secondaryButton = {
  ...baseButton,
  color: "#2f2b68",
  background: "#fff",
  border: "1px solid #e5e7eb",
};

const skipButton = {
  ...secondaryButton,
  whiteSpace: "nowrap",
};

const storyAnimations = `
@keyframes meetroStoryIn {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes meetroStoryPulse {
  0%, 100% {
    opacity: 0.58;
    transform: scale(0.98);
  }
  50% {
    opacity: 1;
    transform: scale(1.01);
  }
}

.meetro-responsive-page,
.meetro-responsive-page * {
  box-sizing: border-box;
  min-width: 0;
}

.meetro-responsive-page {
  word-break: normal;
  overflow-wrap: normal;
  hyphens: none;
}

@media (max-width: 780px) {
  .meetro-responsive-page {
    padding-left: 14px !important;
    padding-right: 14px !important;
  }

  .meetro-responsive-page section[aria-live="polite"] {
    border-radius: 24px !important;
  }
}

@media (max-width: 720px) {
  .meetro-story-screen-stage {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 560px) {
  .meetro-story-controls {
    grid-template-columns: 1fr 1fr !important;
  }

  .meetro-story-controls > div {
    grid-column: 1 / -1;
    order: -1;
  }

  .meetro-responsive-page button {
    max-width: 100%;
  }
}
`;

export default MeetroStory;
