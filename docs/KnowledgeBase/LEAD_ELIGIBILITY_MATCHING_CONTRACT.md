# Lead Eligibility Matching Contract

**Status:** Active contract  
**Runtime effect:** Documentation only  
**Applies to:** Frontend/local lead visibility and future backend lead distribution

This contract defines the minimum safety rules for deciding whether a
professional may see or receive a service request lead.

## Authoritative Gates

### `canProfessionalReceiveRequest(professional, request)`

Purpose: verifies the professional is allowed to receive the type of request.

This gate covers:

- service domain matching
- service category matching
- specialty matching when available
- availability and emergency availability where represented by the matcher

Wrong domain must always block. Wrong specialty must always block. Unknown or
missing request domain must block.

### `canProfessionalServeArea(professional, request)`

Purpose: verifies the professional can serve the request location.

This gate covers:

- coordinate and service radius matching, when valid coordinates exist
- zip fallback
- city fallback
- explicit demo/local-safe missing-location exception

Missing or unknown location must block unless the record is explicitly demo or
local safe.

### `canProfessionalReceiveLead(professional, request)`

Purpose: the final eligibility gate for lead exposure or assignment.

Required rule:

```text
canProfessionalReceiveLead =
  canProfessionalReceiveRequest(professional, request)
  AND
  canProfessionalServeArea(professional, request)
```

If either gate fails, the lead must not be exposed or assigned.

## Supported Service Domains

The current matching contract supports:

- `home_services`
- `healthcare`
- `property_management`
- `transportation`

Unknown request domains fail closed. Unknown professional domains fail closed.

## Supported Specialty Foundation

### Home Services

- `handyman`
- `door_replacement`
- `painting`
- `drywall`
- `plumbing`
- `electrical`
- `tile`
- `cabinetry`
- `flooring`
- `pressure_washing`
- `appliance_installation`
- `general_maintenance`

The broader matcher also recognizes legacy home-service categories such as
`door_repair`, `door_installation`, `cleaning`, `roofing`, `landscaping`, and
related aliases. Those aliases must still stay inside the `home_services`
domain.

### Healthcare

- `home_health`
- `senior_care`
- `nursing`
- `caregiver`
- `medical_transport`
- `medical_care`
- `therapy`

Healthcare requests must never route to handyman, painter, cleaner, or other
home-service professionals unless the request is explicitly and correctly
classified as a home-service request.

### Property Management

- `tenant_ticket`
- `rental_maintenance`
- `inspection`
- `unit_turnover`
- `vendor_dispatch`
- `property_maintenance`
- `property_management`

Tenant tickets and rental maintenance must not route to a handyman unless the
professional is explicitly eligible for property-management work.

### Transportation

- `private_transportation`
- `automotive_services`
- `car_detailing`
- `mechanic`
- `mobile_services`
- `moving`

## Required Request Fields

Requests should provide as many of these fields as possible:

- `serviceDomain` or `service_domain`
- `category`, `requestCategory`, or `request_category`
- `serviceSpecialty` or `service_specialty`
- `city`, `primaryCity`, or `serviceArea`
- `zip`, `zipCode`, `zip_code`, `postalCode`, or `postal_code`
- `latitude` / `longitude` or `lat` / `lng`
- emergency indicators where relevant, such as `type`, `urgency`, or
  `isEmergency`
- explicit local/demo flags only for fixtures, such as `localDemoSafe`,
  `demoSafe`, or `isDemo`

Requests with missing or unknown domain fail closed. Requests with missing
location fail closed unless explicitly demo/local safe.

## Required Professional Fields

Professional profiles should provide as many of these fields as possible:

- `serviceDomain`, `businessServiceDomain`, or `serviceDomains`
- `businessCategory`, `category`, or `serviceCategory`
- `serviceCategories` or `businessServiceCategories`
- `serviceSpecialties` or `businessServiceSpecialties`
- `serviceZipCodes`, `zipCodes`, or `zip`
- `serviceCities`, `primaryCity`, `city`, or `serviceArea`
- `latitude` / `longitude` or `lat` / `lng`
- `serviceRadiusMiles` or `service_radius_miles`
- `emergencyAvailable` when emergency matching is involved

Professional records with missing or unknown domain fail closed.

## Fail-Closed Rules

The following must always block lead eligibility:

1. Wrong domain.
2. Wrong specialty.
3. Missing or unknown request domain.
4. Missing or unknown professional domain.
5. Missing request location, unless explicitly demo/local safe.
6. Different zip or city when fallback location matching is used.
7. Coordinate distance outside the professional service radius.
8. Healthcare emergency routed to a home-service professional.
9. Unknown request routed to handyman, painter, or any other default category.

No code path may default an unknown request to `handyman`.

## Demo and Local-Safe Exception

Demo/local-safe exists only to keep local seed data and QA fixtures usable when
they intentionally omit location.

Allowed:

- bypass missing location only
- preserve Sarah, William, Jack, seed, demo, and QA fixtures where explicitly
  marked or locally recognized

Not allowed:

- bypass wrong domain
- bypass wrong specialty
- bypass unknown request domain
- bypass healthcare-to-home-services separation

## Frontend and Backend Parity

Frontend/local helpers and backend helpers must stay behaviorally aligned.

Frontend:

- `src/utils/professionalRequestMatching.js`
- `src/utils/serviceAreaMatching.js`
- `src/utils/leadEligibility.js`
- `src/utils/localLeadVisibility.js`

Backend:

- `server/utils/professionalRequestMatching.js`
- `server/utils/serviceAreaMatching.js`
- `server/utils/leadEligibility.js`

Parity tests must cover the allowed and blocked examples in:

- `tests/leadEligibility.test.js`
- `tests/localLeadVisibility.test.js`
- `server/tests/leadEligibility.test.js`
- `server/tests/serviceAreaMatching.test.js`
- `tests/professionalRequestMatchingParity.test.js`

## Future Backend Distribution Rule

Before any real marketplace lead distribution, notification, assignment,
ranking, or paid lead routing is introduced, the backend must call:

```js
canProfessionalReceiveLead(professional, request)
```

before exposing or assigning a lead.

This rule applies before ranking, pricing, paid placement, notifications,
dispatch, or AI assistance. Ranking may only choose among already eligible
professionals; it must never make an ineligible professional eligible.

