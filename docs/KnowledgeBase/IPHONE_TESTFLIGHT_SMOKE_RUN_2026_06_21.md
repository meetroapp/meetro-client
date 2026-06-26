# iPhone TestFlight Smoke Run

Date: 2026-06-21

Use this as William's short real-device run sheet. It is based on `docs/KnowledgeBase/TESTFLIGHT_SMOKE_QA_CHECKLIST.md` and is meant for one focused iPhone pass before the first friends/family TestFlight group.

Mark each line: Pass / Fail / Confusing / Not Tested.

## Run Info

- Tester:
- iPhone model:
- iOS version:
- App build:
- Language: English / Spanish / Both
- Network: Wi-Fi / Cellular / Weak / Offline test
- Screen recording on? Yes / No

## 1. Legal Before Login

- Open the app while logged out.
- Tap Terms of Use.
- Tap Privacy Policy.
- Tap Emergency Disclaimer.
- Tap AI Assistance Disclaimer.
- Confirm each opens without requiring login.
- Confirm Back returns to Login.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 2. Signup, Login, And 2FA

- Create or open a homeowner account.
- Confirm signup requires legal acceptance.
- Confirm the 2FA screen appears.
- Enter demo code: `123456`.
- Confirm the app enters the correct homeowner experience.
- Log out from Profile.
- Log back in and use `123456` again.
- Force close/reopen and confirm session persistence behaves as expected.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 3. Homeowner Request Flow

- From homeowner Home, tap Request.
- Create a normal request with category, title, description, address, and photo if practical.
- Submit the request.
- Confirm it appears in Active Requests.
- Tap the circular Details icon and confirm the bottom sheet opens.
- Tap Open Request and confirm homeowner BottomNav remains visible.
- Confirm no Work Center or Business Dashboard navigation appears.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 4. Emergency Request Flow

- Start Emergency Help.
- Select an emergency type.
- Add issue/access notes and photo if practical.
- Send the emergency request.
- Confirm the emergency status or chat opens.
- Confirm homeowner BottomNav remains homeowner mode.
- Confirm no professional route appears unless switching to a professional account intentionally.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 5. Professional Onboarding

- Log in or sign up as a professional.
- Use demo code: `123456`.
- Confirm Professional Setup appears when not completed/skipped.
- Complete or skip onboarding.
- Confirm Business Dashboard opens.
- Open Business Tools -> Professional Setup.
- Confirm previous setup information is prefilled and editable.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 6. Work Center Sarah Flow

- Open Work Center from professional BottomNav.
- Confirm landing shows the main entry cards only.
- Open Current Jobs.
- Open Sarah's job.
- Confirm the job hub shows Current Status, Next Action, and one primary action.
- Confirm Supporting Records are collapsed by default.
- Confirm Back returns to the correct Work Center section.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 7. Evaluation To Proposal

- From Sarah's job at Visit Confirmed, tap Record Evaluation Notes.
- Select Service Type.
- Select Context.
- Confirm requirement preview appears.
- Save Evaluation.
- Confirm Create Proposal appears only after save.
- Tap Create Proposal.
- Confirm Quote/Proposal Builder opens.
- Confirm all fields remain editable.
- Confirm Back label returns to Work Center or Sarah Job.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 8. Proposal Approval

- Send or save the proposal where practical.
- Switch to homeowner/customer review if available.
- Open the proposal.
- Confirm scope, total, and terms are readable.
- Approve the proposal.
- Return to professional Work Center.
- Confirm the job shows waiting/payment/schedule next step, not completed work.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 9. Payment / Deposit

- From the professional job hub, tap Record Payment when available.
- Record payment or deposit evidence.
- Confirm Schedule Work appears only after approval/payment requirements are satisfied.
- Confirm payment summary is visible in Supporting Records or History.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 10. Schedule And Active Work

- Tap Schedule Work.
- Enter schedule details.
- Confirm schedule appears in the job.
- Progress through Mark On The Way.
- Progress through Mark Arrived.
- Tap Start Work.
- Confirm status labels match between Current Jobs list and open job hub.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 11. Completion, Receipt, And Closure

- Tap Complete Work.
- Confirm Completion Sheet opens.
- Save completion notes/photos where practical.
- Confirm Completion does not replace Evaluation Notes.
- Tap Create Receipt.
- Confirm Invoice/Receipt Builder opens with Customer Information.
- Save/send receipt where practical.
- Tap Close Job.
- Confirm closure requires confirmation and does not happen accidentally.
- Confirm closed job moves to Job History.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 12. Service History And Job History

- As homeowner, open Service History.
- Confirm closed/completed service appears.
- Tap Details icon and confirm bottom sheet opens.
- Tap View Record and confirm homeowner BottomNav remains visible.
- As professional, open Work Center -> Job History.
- Confirm closed jobs only.
- Confirm records are read-only.
- Confirm Evaluation, Findings, Recommendations, Proposal, Payment, Receipt, Completion, Closure, and Timeline appear where data exists.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 13. Mobile Safety Pass

- Check notch/Dynamic Island: top content and back buttons are visible.
- Check BottomNav: no button or save action is covered.
- Check keyboard: fields in login, request, messages, onboarding, quote, invoice, and evaluation remain usable.
- Rotate to landscape and back.
- Scroll Home, Work Center, Business Tools, Quote, Invoice, and History.
- Confirm no horizontal shifting, clipped cards, white screens, or blocked primary actions.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## 14. Feedback Capture

- Open Profile or Meetro Assistant.
- Submit a feedback item.
- Include what you tried, what confused you, what did not work, and screenshot note.
- Confirm the app says feedback was saved.

Result:

- Pass / Fail / Confusing / Not Tested:
- Screenshot notes:

## Issue Template

- Severity: Critical / High / Medium / Low
- Screen:
- Role: Homeowner / Professional
- Start state:
- Steps:
- Expected:
- Actual:
- Could recover? Yes / No
- Screenshot or recording:
- Keyboard involved? Yes / No
- BottomNav involved? Yes / No
- Notch/safe area involved? Yes / No

## Final Result

- Homeowner flow: Pass / Fail / Needs follow-up
- Professional flow: Pass / Fail / Needs follow-up
- Legal pre-login: Pass / Fail / Needs follow-up
- Mobile layout: Pass / Fail / Needs follow-up
- Biggest blocker:
- Biggest confusion:
- Recommended next fix:
