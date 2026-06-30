# Public Presence Standard

## Purpose

The Meetro public website exists to identify Meetro Community publicly, provide a valid company contact path, and support external review needs before launch.

The public website is intentionally separate from the authenticated Meetro application.

Future product marketing belongs here.

Authenticated product experiences belong inside the app.

Do not merge these experiences without explicit architectural approval.

## Architecture

The public website renders before the authenticated app shell mounts.

Public routes are handled by the standalone public presence:

- `/`
- `/privacy`
- `/terms`
- `/contact`

Application routes are handled by the Meetro app:

- `/app`
- `/login`

Native Capacitor startup bypasses the public site and opens the app path as before.

The public site must not depend on authenticated app navigation, app state, app session behavior, BottomNav, Meetro Assistant overlays, Work Center, Home, Messages, Business Dashboard, or other authenticated product surfaces.

## Public vs App Separation

Public pages answer:

- What is Meetro Community?
- Who develops and publishes it?
- How can someone contact the company?
- Where can public legal information live?

App pages answer:

- Who is the active user?
- What work is active?
- What needs attention next?
- What authenticated workflow should continue?

These are different responsibilities.

The public website should never behave like the app.

The app should never be required to view public company information.

## Allowed Public Content

Public pages may include:

- Meetro
- Community
- Connect. Communicate. Complete.
- Preparing for launch
- Meetro Community is a product of WM FLEX LABS, LLC.
- Developed and published by WM FLEX LABS, LLC.
- Contact: william@flexlabs.com
- Privacy Policy
- Terms of Service
- Contact Us
- Copyright information
- Future official public marketing approved for public release

## Not Allowed Public Content

Public pages must not include:

- Authenticated app routes
- Login state
- BottomNav
- Meetro Assistant or AI overlays
- Work Center
- Home
- Messages
- Business Dashboard
- Auth session providers
- User data
- Project data
- Screenshots before approval
- Pricing before approval
- Roadmap details before approval
- TestFlight details unless explicitly approved
- Claims about App Store availability before launch

## Future Evolution

### Phase 1 — Public Presence

The public website identifies Meetro Community, WM FLEX LABS, LLC, and the public contact path.

This phase is quiet, factual, and minimal.

### Phase 2 — TestFlight

The public website may support TestFlight review needs only when the wording is accurate, approved, and not confused with public launch.

### Phase 3 — Public Launch

The public website may expand into official public launch marketing, support content, public legal policies, and App Store links only when those claims are true.

## Closing Principle

Public presence protects trust before the product is public.

The app protects work after the user enters Meetro.

These experiences should remain separate until architecture intentionally says otherwise.
