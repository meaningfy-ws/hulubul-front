## ADDED Requirements

### Requirement: Silent client-side location capture
The sender questionnaire v2 form SHALL attempt to capture the visitor's
approximate location on mount using the browser's geolocation API, without
displaying any prompt, checkbox, or consent copy in the form itself.

#### Scenario: Browser grants geolocation permission
- **WHEN** the sender questionnaire v2 form mounts and the browser's
  geolocation permission is granted (already granted previously, or granted
  via the browser's own native prompt)
- **THEN** the form holds the resolved coordinates (`source: "geolocation"`,
  latitude, longitude, accuracy) in local state, with no additional UI
  rendered for this

#### Scenario: Browser denies or lacks geolocation support
- **WHEN** the sender questionnaire v2 form mounts and geolocation
  permission is denied, unavailable, or the request times out
- **THEN** the form's location state is empty (`null`), and the form
  renders and behaves identically to a successful capture in every other
  respect

### Requirement: Location capture never blocks submission
The sender questionnaire v2 form SHALL allow submission regardless of
whether location capture has resolved, and SHALL NOT treat a missing or
unresolved location as a validation error.

#### Scenario: User submits before location resolves
- **WHEN** the user completes and submits the sender questionnaire v2 form
  before the silent geolocation request has resolved
- **THEN** the submission proceeds and succeeds with no location value
  attached, and no validation error is shown for the missing location

#### Scenario: User submits after location is denied
- **WHEN** the user submits the sender questionnaire v2 form after
  geolocation permission was denied
- **THEN** the submission proceeds and succeeds with no location value
  attached, and no validation error is shown

### Requirement: Location included in submission payload
When a location has been resolved client-side, the sender questionnaire v2
submission payload SHALL include it as an optional field, using the same
shape as the landing waitlist form's location field.

#### Scenario: Resolved location is included in the request
- **WHEN** the sender questionnaire v2 form submits after successfully
  resolving a browser location
- **THEN** the request payload sent to the survey-v2 API route includes a
  `location` field shaped `{ source: "geolocation", lat, lon,
  accuracyMeters }`

### Requirement: Server-side IP fallback for missing location
The sender questionnaire v2 API route SHALL attempt to resolve an
approximate location from request headers when the client did not supply
one, before forwarding the submission onward.

#### Scenario: Client sends no location, IP headers are present
- **WHEN** the survey-v2 API route receives a submission with no `location`
  field (or `location: null`) and the request carries IP-geolocation
  headers
- **THEN** the route resolves a location shaped `{ source: "ip", city,
  country }` from those headers and includes it in the payload it forwards

#### Scenario: Client sends no location, no IP headers are present
- **WHEN** the survey-v2 API route receives a submission with no `location`
  field and the request carries no IP-geolocation headers
- **THEN** the route forwards the submission with `location: null`, and the
  submission still succeeds

### Requirement: Submission succeeds independent of backend field readiness
The sender questionnaire v2 submission flow SHALL NOT fail or reject a
submission solely because the receiving collection does not yet persist the
`location` field.

#### Scenario: Backend has not yet added the location field
- **WHEN** a sender questionnaire v2 submission carrying a resolved
  `location` value is sent to a backend that does not yet store a
  `location` attribute on its collection
- **THEN** the submission still completes successfully from the visitor's
  perspective (the API route returns success), regardless of whether the
  location value is persisted on the backend
