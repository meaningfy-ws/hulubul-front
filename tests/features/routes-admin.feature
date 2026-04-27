Feature: Routes Admin Page
  As an admin
  I want to manage transport routes from a dedicated page
  So that I can maintain the network of city corridors without the Strapi admin UI

  Background:
    Given the admin is on the "/admin/rute" page
    And the Strapi API is available
    And the geocode-suggest proxy is available

  # ──────────────────────────────────────────────
  # LIST VIEW
  # ──────────────────────────────────────────────

  Scenario: See all routes in the table on load
    Given the API returns 3 routes with mixed statuses
    When the page loads
    Then the routes table shows 3 rows
    And each row shows the route name, city list excerpt, and status badge

  Scenario: Empty state when no routes exist
    Given the API returns 0 routes
    When the page loads
    Then the message "Nicio rută adăugată încă" is shown
    And the "+ Adaugă rută" button is visible

  # ──────────────────────────────────────────────
  # CITY TAG INPUT — AUTOCOMPLETE
  # ──────────────────────────────────────────────

  Scenario: Typing in the city input triggers autocomplete
    Given the create form is open
    When the admin types "Lux" into the city input
    Then after 300 ms a request is sent to "/api/geocode-suggest?q=Lux&limit=5"
    And a dropdown appears with up to 5 city suggestions

  Scenario: Autocomplete shows city name and country for disambiguation
    Given the geocode-suggest proxy returns:
      | name       | country |
      | Luxembourg | LU      |
      | Luxeuil    | FR      |
    When the admin types "Lux" into the city input
    Then the dropdown shows "Luxembourg, LU" and "Luxeuil, FR"

  Scenario: Selecting a suggestion adds it as a chip
    Given the create form is open and the dropdown shows "Luxembourg, LU"
    When the admin clicks "Luxembourg, LU"
    Then a chip "Luxembourg" is added to the city tag input
    And the text input is cleared
    And the dropdown closes

  Scenario: Autocomplete triggers on text after the last chip — not the full string
    Given the city input already has chips: [Luxembourg] [Metz]
    When the admin types "Ly" in the text input
    Then the request sent is "/api/geocode-suggest?q=Ly&limit=5"
    And not "/api/geocode-suggest?q=Luxembourg, Metz, Ly&limit=5"

  Scenario: Pressing Backspace on empty input removes the last chip
    Given the city input has chips: [Luxembourg] [Metz] [Lyon]
    When the admin presses Backspace with an empty text input
    Then the "Lyon" chip is removed
    And the input focus remains in the text field

  Scenario: Pressing Escape closes the dropdown without adding a city
    Given the dropdown is showing suggestions
    When the admin presses Escape
    Then the dropdown closes
    And no chip is added
    And the typed text remains in the input

  Scenario: Keyboard navigation in autocomplete dropdown
    Given the dropdown shows 3 suggestions
    When the admin presses ArrowDown twice then Enter
    Then the second suggestion is selected and added as a chip

  Scenario: Autocomplete fetch failure shows fallback message
    Given the geocode-suggest proxy returns a 502 error
    When the admin types "Chi" into the city input
    Then the dropdown shows "Nu s-au găsit sugestii"
    And the admin can still type a city name manually and press Enter to add it

  Scenario: City input fewer than 2 characters does not trigger autocomplete
    When the admin types "L" into the city input
    Then no request is sent to "/api/geocode-suggest"

  # ──────────────────────────────────────────────
  # ORIGIN / DESTINATION MARKERS
  # ──────────────────────────────────────────────

  Scenario: First chip is labelled Plecare, last chip is labelled Destinație
    Given the city input has chips: [Luxembourg] [Metz] [Lyon] [Chișinău]
    Then the chip "Luxembourg" has the badge "Plecare"
    And the chip "Chișinău" has the badge "Destinație"
    And the chips "Metz" and "Lyon" have no badge

  Scenario: Single chip is labelled Plecare only
    Given the city input has exactly one chip: [Luxembourg]
    Then the chip "Luxembourg" has the badge "Plecare"
    And no chip has the badge "Destinație"

  # ──────────────────────────────────────────────
  # CREATE ROUTE
  # ──────────────────────────────────────────────

  Scenario: Open the create form
    When the admin clicks the "+ Adaugă rută" button
    Then the RouteFormDrawer slides in
    And the city tag input is empty
    And the status field defaults to "approved"

  Scenario Outline: Successfully create a route
    When the admin opens the create form
    And fills in "name" with "<name>"
    And adds cities via the tag input: "<cities>"
    And selects status "<status>"
    And submits the form
    Then a POST is sent to "/api/routes" with citiesText "<cities_joined>"
    And the new route appears in the table
    And the drawer closes

    Examples:
      | name                  | cities                                     | cities_joined                              | status   |
      | Luxembourg → Chișinău | Luxembourg, Metz, Lyon, Milano, Chișinău   | Luxembourg, Metz, Lyon, Milano, Chișinău  | approved |
      | Paris → București     | Paris, Lyon, Geneva, Verona, București     | Paris, Lyon, Geneva, Verona, București    | draft    |

  Scenario: Create form validation — fewer than 2 cities
    When the admin fills the name and adds only 1 city chip
    And submits the form
    Then a validation error "Adaugă cel puțin 2 orașe" appears on the city field
    And no POST request is sent

  Scenario: Create form validation — name required
    When the admin submits the form without filling the name
    Then a validation error appears for the "name" field

  Scenario: Geocoding spinner shown during save
    When the admin submits a valid create form
    Then the drawer shows "Se calculează coordonatele…" while saving

  Scenario: Geocoding success — polyline appears on map
    Given geocoding succeeds for all submitted cities
    When the admin saves the route
    Then after save the route's polyline appears on the map

  Scenario: Geocoding failure warning after save
    Given geocoding returns no results for the submitted cities
    When the admin saves the route
    Then a warning banner "Geocodificarea a eșuat. Poți introduce coordonatele manual în câmpul GeoJSON." is shown in the drawer
    And the route row shows the "⚠ fără coordonate" badge
    And no polyline is drawn for this route

  # ──────────────────────────────────────────────
  # EDIT ROUTE
  # ──────────────────────────────────────────────

  Scenario: Edit form is pre-filled with existing route data
    Given a route named "Luxembourg → Chișinău" with cities "Luxembourg, Metz, Lyon, Chișinău" and status "approved"
    When the admin clicks "Edit" on that row
    Then the RouteFormDrawer slides in
    And the "name" field contains "Luxembourg → Chișinău"
    And the city tag input shows chips: [Luxembourg] [Metz] [Lyon] [Chișinău]
    And the "status" field shows "approved"

  Scenario: Edit a route name
    Given the edit form is open
    When the admin changes the name to "Lux → Chi"
    And submits the form
    Then a PUT is sent to "/api/routes/:id" with "name": "Lux → Chi"
    And the table row updates to "Lux → Chi"

  Scenario: Adding a city in edit form updates citiesText
    Given the edit form shows chips: [Luxembourg] [Metz] [Chișinău]
    When the admin adds "Lyon" between "Metz" and "Chișinău"
    And submits the form
    Then the PUT payload includes citiesText "Luxembourg, Metz, Lyon, Chișinău"

  Scenario: Manually correcting null geoJson
    Given a route with geoJson null and the edit form is open
    When the admin expands the "GeoJSON" collapsible section
    And pastes a valid LineString JSON
    And submits
    Then the route's polyline appears on the map

  # ──────────────────────────────────────────────
  # DELETE ROUTE
  # ──────────────────────────────────────────────

  Scenario: Delete with confirmation
    Given a route named "Paris → București" exists
    When the admin clicks "Delete" on that row
    Then inline confirmation "Ștergi ruta Paris → București?" appears
    When the admin clicks "Șterge"
    Then a DELETE is sent to "/api/routes/:id"
    And the route disappears from the table and from the map

  Scenario: Cancel delete
    Given a route named "Frankfurt → Iași" exists
    When the admin clicks "Delete" and then "Anulează"
    Then no DELETE request is sent
    And the route remains in the table

  # ──────────────────────────────────────────────
  # FILTER — STATUS
  # ──────────────────────────────────────────────

  Scenario: Status filter pills update list and map
    Given routes with statuses: approved, draft, suspended
    When the admin clicks the "Ciornă" pill
    Then only draft routes appear in the table
    And only draft polylines are visible on the map

  Scenario: "Toate" pill shows all routes
    Given the status filter is set to "Aprobate"
    When the admin clicks "Toate"
    Then routes of all statuses appear in the table

  # ──────────────────────────────────────────────
  # FILTER — TRANSPORTER
  # ──────────────────────────────────────────────

  Scenario: Transporter filter shows only routes served by that transporter
    Given 3 routes exist: routes A and B are served by "Ion Transport", route C is not
    When the admin selects "Ion Transport" in the Transportator filter
    Then only routes A and B appear in the table and on the map

  Scenario: Multiple transporters selected uses OR logic within the filter
    Given routes A–D with different transporters
    When the admin selects "Ion Transport" and "Maria Express"
    Then routes served by either transporter appear in the list

  Scenario: Deselecting all transporters removes the filter
    Given the Transportator filter has "Ion Transport" selected
    When the admin deselects "Ion Transport"
    Then all routes appear again

  # ──────────────────────────────────────────────
  # FILTER — CITY
  # ──────────────────────────────────────────────

  Scenario: City text filter matches substring of citiesText
    Given routes:
      | name                  | citiesText                              |
      | Luxembourg → Chișinău | Luxembourg, Metz, Lyon, Chișinău        |
      | Paris → București     | Paris, Lyon, Geneva, București          |
      | Frankfurt → Iași      | Frankfurt, Innsbruck, Trieste, Iași     |
    When the admin types "Lyon" in the Oraș filter
    Then routes "Luxembourg → Chișinău" and "Paris → București" appear
    And "Frankfurt → Iași" is hidden from both list and map

  Scenario: City filter is case-insensitive
    Given a route with citiesText "Luxembourg, Metz, Chișinău"
    When the admin types "chisinau" in the Oraș filter
    Then the route is shown (case-insensitive substring match)

  Scenario: City filter clears on backspace to empty
    Given the Oraș filter contains "Lyon"
    When the admin clears the city filter input
    Then all routes appear again

  # ──────────────────────────────────────────────
  # FILTER — FREQUENCY
  # ──────────────────────────────────────────────

  Scenario: Frequency filter shows routes with matching schedule
    Given:
      | route                 | schedule frequency |
      | Luxembourg → Chișinău | weekly             |
      | Paris → București     | monthly            |
      | Frankfurt → Iași      | on_demand          |
    When the admin checks "Săptămânal" in the Frecvență filter
    Then only "Luxembourg → Chișinău" appears

  Scenario: Multiple frequency checkboxes use OR logic
    Given routes with weekly and monthly schedules
    When the admin checks both "Săptămânal" and "Lunar"
    Then routes with weekly OR monthly schedules appear

  # ──────────────────────────────────────────────
  # FILTER — DEPARTURE DAYS
  # ──────────────────────────────────────────────

  Scenario: Departure day filter shows routes departing on selected days
    Given:
      | route                 | departureDays |
      | Luxembourg → Chișinău | ["wed"]       |
      | Paris → București     | ["mon","fri"] |
      | Frankfurt → Iași      | ["sat"]       |
    When the admin checks "Mi" (Wednesday) in the Zile plecare filter
    Then only "Luxembourg → Chișinău" appears

  Scenario: Multiple departure days use OR logic
    Given routes departing on different days
    When the admin checks "Mi" and "Vi"
    Then routes that depart on Wednesday OR Friday appear

  # ──────────────────────────────────────────────
  # FILTER — COMBINATION (AND logic)
  # ──────────────────────────────────────────────

  Scenario: Multiple filter dimensions combine with AND logic
    Given:
      | route                 | status   | transporter    | frequency | departureDays |
      | Luxembourg → Chișinău | approved | Ion Transport  | weekly    | ["wed"]       |
      | Paris → București     | approved | Maria Express  | weekly    | ["mon"]       |
      | Frankfurt → Iași      | draft    | Ion Transport  | monthly   | ["wed"]       |
    When the admin selects status "Aprobate", transporter "Ion Transport", and day "Mi"
    Then only "Luxembourg → Chișinău" appears
    # approved AND served by Ion Transport AND departs Wednesday

  Scenario: Filter yielding no results shows empty state message
    When active filters match no routes
    Then the message "Nicio rută corespunde filtrelor selectate." appears
    And a "Resetează filtrele" link is visible

  Scenario: Reset all filters
    Given status filter is "Aprobate", city filter is "Lyon", frequency is "Săptămânal"
    When the admin clicks "Resetează filtrele"
    Then all filters return to default (no constraint)
    And the full route list is shown

  Scenario: Active filter count displayed
    When 3 filter dimensions are non-default
    Then the filter panel shows "3 filtre active"

  # ──────────────────────────────────────────────
  # MAP INTERACTIONS
  # ──────────────────────────────────────────────

  Scenario: Only filtered routes appear as polylines
    Given 5 routes total, 2 match the current filter
    Then exactly 2 polylines are visible on the map

  Scenario: Clicking a map polyline opens the detail panel and highlights list row
    When the admin clicks the polyline for "Luxembourg → Chișinău"
    Then the RouteDetailPanel opens showing that route's data
    And the corresponding table row is highlighted

  Scenario: Clicking a table row highlights polyline and opens detail panel
    When the admin clicks the list row for "Paris → București"
    Then the polyline for that route becomes bold (weight 6)
    And the RouteDetailPanel shows that route's data

  # ──────────────────────────────────────────────
  # ROUTE DETAIL PANEL
  # ──────────────────────────────────────────────

  Scenario: Detail panel shows all route fields
    Given a route:
      | name         | Luxembourg → Chișinău                      |
      | citiesText   | Luxembourg, Metz, Lyon, Chișinău            |
      | status       | approved                                    |
      | submittedBy  | admin@hulubul.com                           |
      | claimedBy    | transporter@example.com                     |
    When the admin selects that route
    Then the detail panel shows:
      | Denumire     | Luxembourg → Chișinău                      |
      | Orase (chips)| Plecare: Luxembourg · Metz · Lyon · Destinație: Chișinău |
      | Status       | Aprobat                                     |
      | Creat de     | admin@hulubul.com                           |
      | Gestionat de | transporter@example.com                     |

  Scenario: Detail panel schedule cards show all fields
    Given route "Luxembourg → Chișinău" has a schedule:
      | transporter name   | Ion Transport SRL         |
      | transporter type   | company                   |
      | phoneNumbers       | ["+352621123456"]         |
      | transportTypes     | ["Colete & pachete"]      |
      | frequency          | weekly                    |
      | departureDays      | ["wed"]                   |
      | arrivalDays        | ["thu"]                   |
      | notes              | null                      |
      | status             | approved                  |
    When the admin selects the route
    Then the schedule card shows:
      | Transportator | Ion Transport SRL (company) |
      | Telefoane     | tel:+352621123456           |
      | Tipuri        | Colete & pachete            |
      | Frecvență     | Săptămânal                  |
      | Zile plecare  | Miercuri                    |
      | Zile sosire   | Joi                         |
    And the "Note" row is not shown

  Scenario: Detail panel notes shown when present
    Given a schedule has notes "Disponibil doar în sezonul de iarnă"
    When the admin selects the associated route
    Then the schedule card shows "Note: Disponibil doar în sezonul de iarnă"

  Scenario: Phone numbers are clickable tel: links
    Given a transporter with phoneNumbers ["+352621123456", "+37369999999"]
    When the admin selects the route
    Then the panel shows anchor tags with href "tel:+352621123456" and "tel:+37369999999"

  Scenario: Detail panel shows "no schedules" message
    Given a route has no schedules
    When the admin selects it
    Then the panel shows "Nicio cursă programată pentru această rută."

  Scenario: Close the detail panel
    Given the detail panel is open
    When the admin clicks ✕
    Then the panel closes, no row is highlighted, and no polyline is bold

  # ──────────────────────────────────────────────
  # ERROR STATES
  # ──────────────────────────────────────────────

  Scenario: Network error on create keeps form open
    Given the API returns 500 on POST /api/routes
    When the admin submits the create form
    Then an error toast appears
    And the drawer stays open with the entered data intact

  Scenario: Network error on delete keeps route in list
    Given the API returns 500 on DELETE /api/routes/:id
    When the admin confirms deletion
    Then an error toast appears
    And the route remains in the table

  Scenario: API 403 on page load shows access denied message
    Given the Strapi API returns 403 on all requests
    When the page loads
    Then "Acces refuzat — verifică token-ul API" is displayed
