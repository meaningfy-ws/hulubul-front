Feature: Public Routes Page
  As a visitor on hulubul.com
  I want to browse active transport routes on a map with filters
  So that I can find a transporter serving my corridor

  Background:
    Given the visitor navigates to "/rute"

  # ──────────────────────────────────────────────
  # PAGE LOAD
  # ──────────────────────────────────────────────

  Scenario: Page shows only approved routes
    Given the API returns routes:
      | name                  | status    |
      | Luxembourg → Chișinău | approved  |
      | Paris → București     | approved  |
      | Unfinished Route      | draft     |
      | Blocked Route         | suspended |
    When the page loads
    Then the map shows 2 polylines
    And the route list shows 2 routes
    And "Unfinished Route" is not visible anywhere
    And "Blocked Route" is not visible anywhere

  Scenario: Approved routes with null geoJson appear in list but not on map
    Given an approved route "No Coords Yet" has geoJson null
    When the page loads
    Then no polyline is drawn for "No Coords Yet"
    But the list entry for "No Coords Yet" is shown

  Scenario: Route list shows city-stop chips with origin/destination badges
    Given an approved route:
      | name       | Luxembourg → Chișinău                              |
      | citiesText | Luxembourg, Metz, Lyon, Milano, Venezia, Chișinău  |
    When the page loads
    Then the list entry shows "Luxembourg → Chișinău"
    And the chip "Luxembourg" has the badge "Plecare"
    And the chip "Chișinău" has the badge "Destinație"
    And middle chips have no badge

  Scenario: No routes — empty state
    Given the API returns 0 approved routes
    When the page loads
    Then the message "Nu există rute active momentan." is shown
    And the map renders empty without errors

  # ──────────────────────────────────────────────
  # FILTER — CITY
  # ──────────────────────────────────────────────

  Scenario: City filter narrows list and map on the public page
    Given approved routes:
      | name                  | citiesText                          |
      | Luxembourg → Chișinău | Luxembourg, Metz, Lyon, Chișinău    |
      | Paris → București     | Paris, Lyon, Geneva, București      |
      | Frankfurt → Iași      | Frankfurt, Innsbruck, Trieste, Iași |
    When the visitor types "Lyon" in the Oraș filter
    Then only "Luxembourg → Chișinău" and "Paris → București" appear
    And "Frankfurt → Iași" is hidden from both list and map

  Scenario: City filter is case-insensitive on public page
    Given a route with citiesText "Luxembourg, Metz, Chișinău"
    When the visitor types "chisinau"
    Then the route is shown

  # ──────────────────────────────────────────────
  # FILTER — TRANSPORTER
  # ──────────────────────────────────────────────

  Scenario: Transporter filter on public page shows only matching routes
    Given approved routes A and B are served by "Ion Transport", route C is not
    When the visitor selects "Ion Transport" in the Transportator filter
    Then only routes A and B appear in the list and on the map

  # ──────────────────────────────────────────────
  # FILTER — FREQUENCY
  # ──────────────────────────────────────────────

  Scenario: Frequency filter on public page
    Given approved routes with different schedule frequencies
    When the visitor checks "Săptămânal"
    Then only routes with a weekly schedule appear

  # ──────────────────────────────────────────────
  # FILTER — DEPARTURE DAYS
  # ──────────────────────────────────────────────

  Scenario: Departure day filter on public page
    Given approved routes departing on different days
    When the visitor checks "Mi" (Wednesday) in Zile plecare
    Then only routes with a Wednesday departure appear

  # ──────────────────────────────────────────────
  # FILTER — COMBINATION AND RESET
  # ──────────────────────────────────────────────

  Scenario: Filters combine with AND logic on public page
    Given approved routes:
      | route                 | transporter    | frequency | departureDays |
      | Luxembourg → Chișinău | Ion Transport  | weekly    | ["wed"]       |
      | Paris → București     | Maria Express  | weekly    | ["mon"]       |
    When the visitor selects "Ion Transport" and checks "Mi"
    Then only "Luxembourg → Chișinău" appears

  Scenario: No results from filter shows empty state with reset link
    When active filters match no approved routes
    Then "Nicio rută corespunde filtrelor selectate." is shown
    And a "Resetează filtrele" link is visible

  Scenario: Resetting filters restores all approved routes
    Given a city filter "Lyon" is active
    When the visitor clicks "Resetează filtrele"
    Then all approved routes are shown

  # ──────────────────────────────────────────────
  # MAP INTERACTION
  # ──────────────────────────────────────────────

  Scenario: Clicking a map polyline highlights the list entry and opens detail panel
    Given "Luxembourg → Chișinău" has a polyline on the map
    When the visitor clicks that polyline
    Then the detail panel opens for "Luxembourg → Chișinău"
    And the list entry is highlighted
    And no edit controls are shown in the panel

  Scenario: Clicking a list entry opens the detail panel
    When the visitor clicks the list entry for "Paris → București"
    Then the detail panel opens showing that route's details and schedules

  # ──────────────────────────────────────────────
  # NO ADMIN CONTROLS
  # ──────────────────────────────────────────────

  Scenario: Admin controls are absent on the public page
    When the page loads
    Then there is no "+ Adaugă rută" button
    And there are no "Edit" or "Delete" buttons on any row or in any panel

  # ──────────────────────────────────────────────
  # SEO
  # ──────────────────────────────────────────────

  Scenario: Page has correct meta title
    When the page loads
    Then the document title contains "Rute de transport"

  # ──────────────────────────────────────────────
  # ERROR STATE
  # ──────────────────────────────────────────────

  Scenario: Backend unavailable renders graceful error
    Given the Strapi API is unreachable
    When the page loads
    Then the page renders without crashing
    And "Rutele nu pot fi încărcate momentan." is shown
