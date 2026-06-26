# Friends & Family TestFlight Smoke QA Checklist

Date: 2026-06-21

Use this checklist for early TestFlight passes. The goal is to find confusion, broken routes, missing back buttons, status mismatches, and mobile layout issues before broader professional testing.

For each item, mark: Pass / Fail / Confusing / Not Tested.

## Tester Setup

- Tester name:
- Device model:
- iOS version:
- App build:
- Role tested: Homeowner / Professional / Both
- Language tested: English / Spanish / Both

## Homeowner

### Account Creation

- Create or open a homeowner account.
- Confirm the first screen explains what to do next.
- Confirm homeowner navigation shows Home, Discover, Request, Messages, Profile.
- Confirm no professional-only Work Center or Business Tools navigation appears.

### Request Creation

- Start a normal service request.
- Add service category or request type.
- Add a description.
- Add a photo if practical.
- Submit the request.
- Confirm the request appears in Active Requests.
- Confirm Open Request opens the correct homeowner-facing request.

### Emergency Request

- Start an emergency request.
- Confirm the emergency copy is clear.
- Confirm the emergency route/status screen opens without switching to professional navigation.
- Confirm Back to Chat or equivalent return action is clear.
- Confirm no unrelated professional/business screen appears.

### Messaging

- Open Messages.
- Send a message.
- Confirm the message appears in the thread.
- Confirm back navigation returns to homeowner messages or Home.
- Confirm unread/status indicators are understandable.

### Schedule Acceptance

- Open a request with a proposed visit or schedule.
- Accept or review the schedule where available.
- Confirm the request status updates.
- Confirm the next step is clear.

### Proposal Review

- Open a request with a proposal/quote.
- Confirm proposal total, scope, and terms are readable.
- Confirm View Quote/Proposal does not show professional controls.
- Confirm back navigation returns to the homeowner request.

### Proposal Approval

- Approve a proposal where available.
- Confirm status changes after approval.
- Confirm the professional side can later see the approval.
- Confirm approval does not skip payment/schedule/work steps unexpectedly.

### Service History

- Open Service History.
- Confirm completed/closed services appear.
- Confirm View Record opens homeowner-facing details.
- Confirm the homeowner BottomNav remains visible.
- Confirm rating/review appears if one was submitted.
- Confirm no other customer history appears.

## Professional

### Onboarding

- Open as a professional account.
- Complete or skip Professional Setup.
- Confirm progress saves between steps.
- Confirm Business Dashboard opens after completion or skip.
- Confirm Business Tools -> Professional Setup can reopen setup later.

### Business Profile

- Open Business Tools.
- Open Business Profile.
- Confirm the page is readable and returns to Business Tools.
- Confirm no Work Center workflow actions appear on Business Profile.

### Leads

- Open Leads or Opportunities.
- Confirm lead cards are understandable.
- Confirm unrelated-domain test requests do not appear where practical.
- Confirm Open Conversation or Schedule Evaluation actions route correctly.

### Work Center

- Open Work Center from BottomNav.
- Confirm landing shows only the main Work Center entry cards.
- Open Current Jobs.
- Open Sarah or another active job.
- Confirm the job hub shows Current Status, Next Action, and one clear primary button.
- Confirm Supporting Records are collapsed by default.

### Evaluation Notes

- From Visit Confirmed, tap Record Evaluation Notes.
- Select Service Type.
- Select Context.
- Confirm requirement preview appears.
- Save Evaluation Notes.
- Confirm Create Proposal appears only after saving.
- Reopen Evaluation after proposal creation and confirm it defaults to read-only summary.

### Proposal Creation

- Tap Create Proposal.
- Confirm Quote/Proposal Builder opens.
- Confirm return label says Back to Work Center or Back to Customer Job when available.
- Confirm fields remain editable.
- Save or send proposal where appropriate.

### Payment

- After approval, tap Record Payment.
- Record payment or deposit.
- Confirm Schedule Work appears only after payment/deposit requirement is satisfied.

### Schedule Work

- Tap Schedule Work.
- Enter schedule details.
- Confirm work schedule appears in the job.
- Confirm future actions stay hidden until schedule/customer confirmation is satisfied.

### Active Work

- Progress through Mark On The Way.
- Progress through Mark Arrived.
- Start Work.
- Confirm each button uses clear verb-first wording.
- Confirm status updates match the Current Jobs list and job hub.

### Completion

- Tap Complete Work.
- Confirm Completion Sheet opens.
- Confirm return label points back to Work Center or the active job.
- Save completion evidence.
- Confirm Completion does not replace Evaluation Notes.

### Receipt

- Create Receipt.
- Open Invoice/Receipt Builder.
- Confirm Customer Information appears.
- Confirm return label points back to Work Center or the active job.
- Save/send receipt where practical.

### Closure

- Tap Close Job.
- Confirm closure confirmation appears.
- Confirm closure does not happen accidentally.
- Confirm closed job moves to Job History.

### History

- Open Job History.
- Confirm closed jobs only.
- Confirm records are read-only.
- Confirm Evaluation Summary, Findings, Recommendations, Proposal, Payment, Receipt, Completion, Closure, and Timeline are visible where data exists.
- Confirm document actions do not mutate the job.

## Cross-User

### Message Delivery

- Send homeowner-to-professional message.
- Send professional-to-homeowner message.
- Confirm each appears in the correct conversation.
- Confirm no Sarah/William/Jack data leaks across conversations.

### Status Updates

- Change a professional workflow status.
- Confirm homeowner-facing status updates where expected.
- Confirm status labels do not contradict between list and detail pages.

### Quote Approval Flow

- Professional sends quote/proposal.
- Homeowner reviews quote/proposal.
- Homeowner approves quote/proposal.
- Professional sees approval and can move to payment/schedule.
- Confirm manual approval remains secondary and does not replace customer approval.

### Work Center Updates

- Confirm Current Jobs status matches open job hub status.
- Confirm Schedule and Revenue remain cross-job.
- Confirm Job History stays read-only.

### Notification Expectations

- Note whether notifications appeared, did not appear, or felt unclear.
- Confirm missing notifications do not block the user from finding the next step in the app.
- Record any confusing badge counts or stale unread indicators.

## Mobile QA

### Notch / Dynamic Island

- Confirm top content is not hidden under the notch or Dynamic Island.
- Confirm headings and back buttons remain tappable.

### Safe Areas

- Confirm bottom actions are not hidden behind the home indicator.
- Confirm pages have enough bottom spacing above BottomNav.

### Keyboard

- Tap fields in request creation, messages, onboarding, quote, invoice, and evaluation forms.
- Confirm focused fields remain visible where practical.
- Confirm save/send buttons remain reachable after dismissing keyboard.

### Rotation

- Rotate to landscape where allowed.
- Confirm no major overlap, clipped cards, or broken navigation.
- Rotate back to portrait and confirm the screen recovers.

### Bottom Navigation

- Confirm BottomNav stays pinned.
- Confirm each tab opens the expected role-specific area.
- Confirm homeowner BottomNav never appears in professional Work Center and professional BottomNav never appears in homeowner Service History.

### Scroll Behavior

- Scroll long Home, Work Center, Business Tools, Quote, Invoice, and History pages.
- Confirm no horizontal shifting.
- Confirm no clipped cards.
- Confirm floating AI button does not block primary actions.

## Feedback Report Template

### Severity

- Critical: app crash, white screen, data leak, wrong role navigation, blocked core flow.
- High: confusing or broken workflow step, missing primary action, bad status mismatch.
- Medium: awkward wording, unclear empty state, layout issue that still allows progress.
- Low: polish, spacing, small copy issue.

### Reproduction Steps

1. Start screen:
2. Tapped:
3. Expected:
4. Actual:
5. Could you recover? Yes / No

### Screenshot Request

- Attach screenshot or screen recording when possible.
- Include the screen name and role.
- Note whether keyboard, BottomNav, or notch was involved.

### Device Details

- Device type:
- iOS version:
- App build:
- Language:
- Role:
- Network condition if relevant:

## Final Smoke Result

- Homeowner result: Pass / Fail / Needs follow-up
- Professional result: Pass / Fail / Needs follow-up
- Cross-user result: Pass / Fail / Needs follow-up
- Mobile result: Pass / Fail / Needs follow-up
- Biggest confusion:
- Biggest blocker:
- Recommended next fix:
