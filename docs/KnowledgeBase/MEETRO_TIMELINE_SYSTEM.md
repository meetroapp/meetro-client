# Meetro Moments System

## Purpose

Meetro Moments preserve accomplishments earned through verified work.

They are not social posts. They are not a feed. They are not status updates.

Meetro Moments exist because real work happened, reached closure, and became part of a relationship's history.

Phase 2 establishes the public product language:

Closed Job -> Project History Created -> Optional Meetro Moment -> Meetro Moments

No Closure, No Meetro Moment.

## Public Naming

The public feature name is:

Meetro Moments

Do not use these names for the user-facing feature:

- Timeline
- Feed
- Posts
- Wall
- Activity

Internal compatibility note:

Existing implementation files, helpers, or model names may still use Timeline or TimelineMoment where changing them would create unnecessary churn. That language is internal only. Public UI, product language, and user-facing documentation should say Meetro Moments.

## Philosophy

Facebook preserves posts.

Instagram preserves stories.

Meetro preserves accomplishments.

Every Meetro Moment should strengthen relationships.

Meetro should never ask people to invent content. It should help them recognize meaningful milestones that already happened.

## Personalized Experience

The Meetro Moments surface personalizes itself by account context.

### Homeowner

Title:

Your Meetro Moments

Subtitle:

Every completed project becomes part of your home's story.

Empty state:

Your story begins with your first completed project.

Examples:

- Purchased Home
- Kitchen Remodel
- Roof Replacement
- HVAC Service
- Landscape Project
- Warranty Renewal
- Annual Maintenance

### Business

Title:

Your Meetro Moments

Subtitle:

Every completed project becomes part of your business legacy.

Empty state:

Every completed project becomes part of your business legacy.

Examples:

- 100th Project Completed
- Kitchen Remodel
- Customer Appreciation
- 5-Star Review
- Community Project
- Employee Anniversary
- Business Milestone

### Employee

Title:

Your Meetro Moments

Subtitle:

Every accomplishment becomes part of your professional journey.

Empty state:

Your professional journey begins with your first completed accomplishment.

Examples:

- Joined Company
- Completed First Project
- Certification Earned
- 100 Projects Completed
- Promotion
- Community Volunteer

### Community

Title:

Community Meetro Moments

Subtitle:

Celebrating the projects that strengthen our community.

Empty state:

Meaningful community accomplishments will appear here.

Community Moments must come from verified community accomplishments. There is no public posting surface.

## Architecture

Meetro Moments are earned from existing Meetro truth.

The initial source is a closed project history record. Meetro may prepare a Meetro Moment from:

- customerName
- businessName
- projectTitle
- projectCategory
- completionDate
- closureDate
- beforePhotos
- afterPhotos
- reviewRating
- reviewText
- warranty
- receipt
- projectId
- relationshipId

The user may add only small personal touches during preservation:

- short reflection
- optional thank-you message
- optional title refinement
- favorite photograph

If the user changes nothing, Meetro saves the prepared story from verified project data.

## Verification Rules

A Meetro Moment cannot exist without verified closure.

Required links:

- projectId
- relationshipId

Allowed statuses:

- draft
- pending_customer_confirmation
- published
- private
- flagged
- hidden
- rejected

Allowed origins:

- closed_job
- project_completion
- customer_review
- warranty_issued
- certification_earned
- community_project
- business_milestone
- employee_milestone
- permit_closed

Disallowed origins include arbitrary updates, ads, memes, unrelated announcements, generic promotions, or unverified claims.

## Closure Flow

After successful Job Closure:

Project Successfully Closed

Project History Saved

Beautiful full-screen Moment Preview

User personalizes the printed story naturally

[ Preserve Meetro Moment ]

[ Keep in History ]

The offer belongs after closure because closure proves that the work has become history. Completion alone is not enough.

## Moment Preservation Experience

Creating a Meetro Moment must never feel like completing a form.

It should feel like preserving a meaningful memory.

The experience should resemble:

- a holiday card
- a wedding album
- a family photo book
- a framed photograph
- a printed keepsake

It must never resemble:

- a database editor
- a social media composer
- a CMS form
- an administration screen

### Photo-First Canvas

Photography leads the experience.

After verified closure, Meetro assembles a full-screen Moment Preview from the project photos and verified project truth.

The user may swipe through the available photographs and tap the one that feels right.

Do not expose upload grids, image managers, cover selectors, or property panels in this preservation flow.

### Story-First Editing

The story itself is editable.

The user taps the printed title or reflection, adjusts the words, taps away, and continues.

Do not show visible text boxes, large text areas, field labels, metadata forms, or multi-step wizards for Moment preservation.

### Law of Preservation

The platform already knows:

- project
- customer
- business
- dates
- photos
- journey
- warranty
- receipt
- review

Never ask the user to re-enter information Meetro already knows.

The platform assembles the Moment.

The user simply makes it personal.

### Preservation Language

Use:

- Preserve Meetro Moment
- Keep in History
- Verified Meetro Moment
- Project Successfully Closed

Do not use:

- Create Post
- Create Moment
- Feed Item
- Composer
- Metadata
- Property Editor

## Customer Confirmation

Customer confirmation is required before public display when a Meetro Moment includes:

- customer identity
- customer review
- customer property photos

When customer confirmation is required, the internal status becomes:

pending_customer_confirmation

Pending moments do not appear publicly until confirmed. They may appear internally as awaiting confirmation.

## Moment Card

Each Meetro Moment should feel timeless.

Recommended information:

- project title
- completion date
- review rating when available
- warranty status when available
- Verified Meetro Moment label
- optional thank-you message
- before and after photos when available

Keep it simple and elegant.

No likes.

No shares.

No comments.

No social interactions.

## Phase 3 Display Rules

Phase 3 polishes Meetro Moments as a quiet accomplishment history.

The card is not a post. It is a preserved milestone from verified work.

Each visible Moment card should prioritize:

- project title
- completion month and year
- project or category icon when available
- relationship context when allowed
- Verified Meetro Moment label when the source event is approved
- calm privacy or confirmation label
- confirmed rating or review summary
- warranty badge when present
- receipt badge when present
- confirmed before and after photo preview
- optional thank-you message

### Verified Badge Meaning

The label must read:

Verified Meetro Moment

This label appears only when the Moment is tied to an approved source event such as closed work, customer review, warranty issued, business milestone, employee milestone, certification earned, permit closed, or verified community project.

Do not use:

- Post
- Feed item
- Social update

### Privacy Labels

Privacy and confirmation language should be calm and clear.

Published:

Published

Pending:

This Moment is waiting for customer confirmation.

Private:

This Moment is saved privately.

Hidden:

This Moment is hidden.

Use moderation language only when moderation actually applies.

### Role-Specific Visibility

Show only Moments appropriate to the current viewer.

Public business profile:

- published only
- no pending moments
- no private customer details before approval

Relationship or project context:

- published moments
- pending moments visible only to involved users
- private and hidden status visible only to owners or involved users

Homeowner:

- homeowner-owned or involved moments only

Business:

- business-owned or involved moments only

Employee:

- employee-owned or involved accomplishments only

Community:

- verified community accomplishments only

### Public vs Private Display

Public surfaces must never expose:

- pending customer details
- private customer details
- hidden Moments
- flagged or rejected Moments
- unverified source events

Owner and involved-user surfaces may show pending, private, or hidden labels so the user understands why a Moment is not publicly visible.

### No Social Behavior

Meetro Moments may list verified accomplishments chronologically.

They must not behave like a social feed.

Do not add engagement actions, public reactions, comment boxes, reposting, follower mechanics, hashtags, trending labels, suggested posts, or infinite scrolling.

## Meetro Moment Detail View

The Meetro Moment detail view is a verified accomplishment page.

It is not a social page.

It exists so an involved person can open a single Moment and understand why the completed work mattered.

It should follow the Meetro Emotional Storytelling Standard:

People and life-after-the-work imagery should lead when available.

Finished spaces, before photos, tools, and technical proof support the story. They should not become the story.

The detail route should be distinct and refreshable:

`#/moments/:momentId`

If a platform serves Meetro through path-based routing, `/moments/:momentId` may resolve to the same detail view. The selected Moment identity must come from the route first, with local state used only as a fallback.

Public route language should use:

- Meetro Moment
- Verified Meetro Moment
- Why this moment matters
- Project Journey
- Related Moments
- Relationship History

The detail view should include:

- Back to Meetro Moments
- Verified Meetro Moment badge
- Moment title
- category
- completion date
- large project image when approved
- before and after preview when approved
- short summary
- thank-you note when available
- relationship context when safe
- project proof and details
- Project Journey from Consultation through Closed
- Related Moments from the same relationship, property, business, or category

### Detail Privacy Rules

The detail view must use the same visibility rules as the Meetro Moments list.

Public viewers may see only published Moments and only approved fields.

Do not expose customer identity, customer review, property photos, cost, or address unless the viewer is involved or customer approval has made that information safe to show.

Pending and private Moments should use calm labels:

- This Moment is waiting for customer confirmation.
- This Moment is saved privately.

If a Moment is missing, unverified, or not visible to the current viewer, the detail view should show a protected unavailable state rather than leaking partial data.

### Relationship Context Rules

Relationship context supports the Moment.

It should never turn the page into a customer database, a project dashboard, or a public profile.

Show only available and allowed relationship context:

- homeowner or customer when approved
- professional or business when approved
- relationship duration when available
- link to Relationship History only when safe

### Project Journey Display

The Project Journey is a simple lifecycle proof line:

Consultation -> Estimate/Quote -> Approval -> Work -> Completed -> Closed

It communicates that the Moment was earned through real work.

It should not become a task manager.

### Detail No-Social Rule

The detail view must not include random creation, engagement buttons, public reactions, comment boxes, follower mechanics, hashtags, trending labels, suggested posts, or infinite scrolling.

## Phase 4 First-Time Experience

Meetro Moments must never feel empty.

A first-time user should open Meetro Moments and feel that a meaningful story is waiting to become their own.

The first-time experience should behave like a beautiful memory book with early pages prepared, not like a blank database.

### Welcome Experience

The top of Meetro Moments should introduce the purpose emotionally.

It should communicate:

- completed work can become story
- relationships become history
- trust leaves a record
- Meetro Moments are earned through verified work

The welcome area should not explain implementation details or ask the user to configure anything.

### Staged Inspiration

Before real Moments exist, Meetro may show staged inspiration.

These examples must be clearly presented as inspiration, not user records.

Staged inspiration must follow the Law of Living Photography.

It should show what changed because work was completed:

- family gathering
- customer trust
- business gratitude
- neighbors connecting
- people feeling safe, calm, proud, or at home

Do not lead staged inspiration with empty rooms, tools, equipment, or construction.

Initial inspiration categories:

- Home Story
- Relationship Story
- Business Legacy
- Community Impact

Each staged Moment should use warm photography, minimal text, and a premium layout so the user can feel what their Meetro Moments may become.

### Replacement Rules

Real Meetro Moments should gradually replace staged inspiration.

Do not remove all examples after the first real Moment.

As real Moments grow, staged examples should reduce naturally until the page belongs entirely to the user's verified history.

Eventually no staged examples remain.

Only real Moments remain.

### Today's Reflection

Meetro Moments should include a large Reflection section.

Reflection exists to inspire, not advertise.

When real Moments exist, Reflection should prefer a real Moment.

Before real Moments exist, Reflection may use staged inspiration to show what the user's story can become.

### Desktop Navigation Width

Desktop navigation must be wide enough to display durable destination names without truncation.

Labels such as Communication, Meetro Moments, and Profile / Account should remain readable.

Additional desktop width should improve clarity, not force users to decode clipped labels.

### Companion Anchoring

The Ask Meetro launcher is the Companion anchor.

When the launcher moves, the Companion panel should open relative to that launcher position.

This keeps the Companion feeling like one present component instead of two disconnected surfaces.

## Display Locations

Phase 2 supports:

- Profile -> Meetro Moments
- Relationship identity integration
- Business Profile integration
- Customer Home placeholder
- Project History integration

Phase 2 does not create a scrolling public feed.

## Future Expansion

Future verified Meetro Moments may include:

- Verified Reviews
- Warranty Completion
- Permit Closure
- Community Volunteer Work
- Employee Recognition
- Business Milestones
- Referral Milestones
- Home Milestones
- Neighborhood Improvements
- Community Projects

Future expansion must preserve the same rule:

The moment must be earned by verified Meetro platform events.

## Moderation Rules

Meetro Moments may be:

- flagged
- hidden
- rejected

Flagged, hidden, and rejected moments must not publish.

Customer-sensitive moments must remain pending until customer confirmation is recorded.

## Restrictions

Do not add:

- Likes
- Shares
- Followers
- Hashtags
- Trending
- Algorithms
- Random posting
- Suggested posts
- Advertising feed
- Infinite scrolling

This is not social media.

## Constitutional Alignment

### The Law of Verified History

Meetro Moments preserve what actually happened.

History must be earned through completed work, verified closure, relationship truth, and responsible confirmation.

Meetro should never ask people to invent history.

### The Law of Natural Continuity

Work becomes closure.

Closure becomes history.

History may become a Meetro Moment.

The user should feel that Meetro carried the work forward naturally, not that they were asked to create content.

## Success Standard

The user should never feel like they are looking at a feed.

They should feel like they are looking at the story they have built over time.

## Phase 5 Wonder Pass

The Wonder Pass protects the first impression.

Before users understand what Meetro Moments can do, they should feel what Meetro
stands for.

The opening hero should say:

- this is where your story begins
- real work can become memory
- relationships can become legacy
- completed work can make life feel more connected

The hero must not feel like a feature introduction, software placeholder, or
empty state.

### Wonder Hero Photography

Hero photography should follow the Law of Living Photography.

Use images that show:

- families
- people at home
- celebration
- trust
- belonging
- community

Avoid leading with:

- empty bedrooms
- empty kitchens
- interior design photography
- furniture-focused rooms
- tools
- construction
- technical completion

The completed project should support the story.

It should never become the story.

### Wonder Copy

Opening copy should feel like an invitation into a memory book.

Prefer language such as:

- story
- beginning
- memory
- journey
- promise
- relationship
- legacy

Avoid visible first-impression language such as:

- placeholder
- records
- generated
- system
- preview data
- empty

### Staged Moment Language

Staged Moments should feel like future memories, not demo content.

They may imply possibility, but should not describe themselves as fake records.

As real Moments arrive, staged inspiration continues to reduce naturally until
the user's story fully replaces it.

### Wonder Test

Before approving the page, ask:

- Would a user stop for a few seconds?
- Would they imagine this becoming their own story?
- Would they feel hope before they understand the feature?

If the answer is no, the Wonder Pass is not complete.

Relationships create communication.

Communication creates understanding.

Understanding creates decisions.

Decisions create work.

Work creates history.

History strengthens relationships.

Powered by the Meetro Intelligence Engine.
