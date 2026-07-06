# Adaptive Layout Standard

Date: July 4, 2026

Status: Official Meetro desktop layout reference

## Purpose

The Adaptive Layout Standard defines how Meetro uses additional screen space without changing the product experience.

This is not a desktop redesign system. It is the shared presentation language for desktop-enabled surfaces.

Phone remains the source of truth.

Desktop adapts presentation.

Never experience.

## Desktop Adaptation Philosophy

Meetro Community is one product across many devices.

The workflow remains the same. The amount of visible context changes only when it helps the user understand where they are, what the surface owns, and what deserves attention.

Desktop should feel:

- Calm
- Balanced
- Predictable
- Intentional
- Attached to the same Meetro home

Desktop should not feel:

- Stretched
- Dense
- Dashboard-heavy
- Different from mobile
- Like a separate application

## Official Breakpoints

These are the architectural breakpoints for layout decisions:

| Range | Width | Behavior |
| --- | --- | --- |
| Compact | Below 768px | Phone-first focused pages, BottomNav, safe-area priority. |
| Medium | 768px and above | Wider readable pages and two-column grids where safe. |
| Desktop | 1180px and above with hover/fine pointer | Sidebar replaces BottomNav; workspace width and companion placement follow desktop tokens. |
| Wide | 1100px and above | Wide surfaces may use expanded grid count and larger readable lanes. |

Use desktop behavior only when width, hover, and fine pointer support it. A tablet may be wide without becoming a desktop workspace.

## Official Workspace Width

Shared layout constants live in `src/index.css`.

| Token | Value | Use |
| --- | --- | --- |
| `--meetro-layout-sidebar-width` | `284px` | Desktop sidebar reservation, including visual margin and full workspace labels. |
| `--meetro-layout-content-max` | `1120px` | Standard responsive workspace width. |
| `--meetro-layout-wide-mid-max` | `1280px` | Medium-wide workspace width before full wide expansion. |
| `--meetro-layout-wide-max` | `1360px` | Maximum wide workspace width. |
| `--meetro-layout-readable-mid-max` | `920px` | Medium readable/detail pages. |
| `--meetro-layout-readable-max` | `960px` | Wide readable/detail pages. |
| `--meetro-layout-form-max` | `860px` | Focused forms and builders before preview layouts exist. |

Desktop pages should not stretch beyond the appropriate token simply because screen width is available.

Extra width should improve composition, not scale components indefinitely.

## Official Spacing System

| Token | Value | Use |
| --- | --- | --- |
| `--meetro-layout-grid-gap-compact` | `14px` | Compact grid and list rhythm. |
| `--meetro-layout-grid-gap` | `16px` | Desktop grid rhythm. |
| `--meetro-layout-section-gap` | `24px` | Space between major desktop sections. |
| `--meetro-layout-card-gap` | `16px` | Space between sibling cards. |
| `--meetro-layout-card-padding` | `18px` | Standard card interior padding baseline. |
| `--meetro-layout-desktop-gutter` | `32px` | Desktop companion and workspace edge breathing room. |

Pages should follow this vertical rhythm:

1. Page Header
2. Primary Summary
3. Primary Workspace
4. Supporting Context
5. Secondary Sections
6. Footer spacing

Do not add large one-off gaps to make a single page feel special.

## Card Spacing

Desktop cards should belong to one visual family:

- Use comfortable padding.
- Keep action placement predictable.
- Keep title and supporting text close enough to scan.
- Keep sibling cards aligned on shared grid edges.
- Avoid oversized hero cards unless that surface is explicitly a dashboard or orientation surface.

Cards may vary in content, but they should not feel like they came from different applications.

## Section Spacing

Sections should communicate hierarchy without adding visual noise.

Use section spacing to separate responsibilities:

- Orientation
- Primary work
- Supporting context
- Reference information

Do not use spacing to create fake importance.

Do not let sections float away from their parent workspace.

## Grid Rules

Use `meetro-responsive-grid` for shared grid behavior where possible.

Default:

- Compact: one column
- Medium: two columns
- Wide: three or four columns only where the content naturally supports it

Grid cards should align to shared edges. Grids should collapse gracefully. Cards should never become so wide that text lines lose readability.

## Sidebar Relationship

Desktop Sidebar is the navigation anchor.

Rules:

- Sidebar appears only at desktop width with hover/fine pointer support.
- BottomNav remains the mobile and tablet navigation pattern.
- Workspaces reserve the sidebar width using `--meetro-sidebar-width`.
- Desktop content should feel attached to the sidebar, not centered as if the sidebar were absent.
- No duplicate navigation should appear.

The sidebar is an anchor, not a control panel.

## Hosted Experience Positioning

Hosted Mobile Experiences must stay temporary and workspace-preserving.

Shared hosted tokens:

| Token | Value | Use |
| --- | --- | --- |
| `--meetro-layout-hosted-width` | `414px` | Maximum hosted card width. |
| `--meetro-layout-hosted-max-height` | `720px` | Maximum hosted card height. |

Requirements:

- Temporary
- Dismissible
- Not drawers
- Not replacement pages
- No workspace blur
- No layout push
- Return to originating workspace

Examples:

- Desktop Hosted Profile Card
- Future Relationship Card
- Future Business Preview
- Future Project Preview
- Future Schedule Preview
- Future Proposal Preview

## Companion Positioning

The Companion should remain present without competing with the workspace.

Shared companion tokens:

| Token | Value | Use |
| --- | --- | --- |
| `--meetro-layout-companion-width` | `388px` | Desktop companion panel width. |
| `--meetro-layout-companion-max-height` | `680px` | Desktop companion panel height. |
| `--meetro-layout-desktop-gutter` | `32px` | Desktop companion edge spacing. |

The Companion may observe, recommend, prepare, and converse when asked.

It may not:

- Resize the workspace
- Push the page
- Cover primary actions
- Duplicate the page
- Own workflow decisions

## Mobile Protection

Mobile behavior is protected.

Do not change:

- BottomNav behavior
- Mobile route flow
- Mobile safe-area handling
- Mobile page hierarchy
- Mobile gestures
- Mobile workflow order

Adaptive layout work must prove it preserved mobile, especially on iPhone portrait.

## Surface Application

Use these shells intentionally:

- `meetro-responsive-page`: standard workspace or page shell.
- `meetro-wide-page`: dashboards, galleries, and multi-column workspaces.
- `meetro-readable-page`: detail, identity, legal, and project pages.
- `meetro-form-page`: focused forms and builders.
- `meetro-responsive-grid`: shared responsive grid behavior.
- `meetro-responsive-card`: shared overflow and card containment.

If a page needs a new layout primitive, first ask whether one of these shells already expresses the surface's role.

## Future Evolution

Future desktop work should happen in this order:

1. Preserve mobile.
2. Use shared layout tokens.
3. Keep the owning surface intact.
4. Reveal related context only when it reduces effort.
5. Avoid desktop-only workflows.
6. Add reusable primitives only after two or more surfaces need the same behavior.

## Constitution Check

Does this preserve one Meetro Community experience across every device?

Yes. The Adaptive Layout Standard lets desktop become calmer and more useful without changing what Meetro is, where work belongs, or how mobile users move through the product.
