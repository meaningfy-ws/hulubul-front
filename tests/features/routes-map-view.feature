Feature: Routes Map Visualisation
  As an admin or visitor
  I want to see transport routes drawn as polylines on a map
  So that I can understand the geographic coverage of the transport network

  # ──────────────────────────────────────────────
  # MAP RENDERING
  # ──────────────────────────────────────────────

  Scenario: Only routes with geoJson are drawn as polylines
    Given the following routes:
      | name                  | status    | geoJson present |
      | Luxembourg → Chișinău | approved  | yes             |
      | Paris → București     | draft     | yes             |
      | Frankfurt → Iași      | suspended | yes             |
      | Ungeocoded Route      | approved  | no              |
    When the RoutesMap renders all 4 routes
    Then exactly 3 polylines are drawn
    And "Ungeocoded Route" has no polyline

  Scenario: Map is centred on Europe at default zoom
    When RoutesMap renders
    Then the map centre is latitude 47, longitude 15
    And zoom level is 5

  Scenario Outline: Polyline colour reflects route status
    Given a route with status "<status>" and valid geoJson
    When the map renders
    Then the polyline stroke colour is "<colour>"

    Examples:
      | status    | colour  |
      | approved  | #22c55e |
      | draft     | #f59e0b |
      | suspended | #ef4444 |

  Scenario: Polyline tooltip shows route name on hover
    Given a route "Luxembourg → Chișinău" with valid geoJson
    When the user hovers over its polyline
    Then the tooltip "Luxembourg → Chișinău" is shown

  Scenario: Selected polyline weight is 6; others are 4
    Given 3 routes with valid geoJson and route id 42 is selected
    When the map renders
    Then the polyline for route 42 has strokeWeight 6
    And the other 2 polylines have strokeWeight 4

  # ──────────────────────────────────────────────
  # FILTERED ROUTES
  # ──────────────────────────────────────────────

  Scenario: Only routes in the routes prop are drawn
    Given 5 routes total, the parent passes only 2 to RoutesMap
    When the map renders
    Then exactly 2 polylines are drawn
    And no other polylines appear

  # ──────────────────────────────────────────────
  # COORDINATE CONVERSION
  # ──────────────────────────────────────────────

  Scenario: GeoJSON [lon, lat] coordinates are converted to Leaflet [lat, lon]
    Given a route with geoJson coordinates [[6.13, 49.61], [28.86, 47.01]]
    When the map renders the polyline
    Then Leaflet receives positions [[49.61, 6.13], [47.01, 28.86]]

  Scenario: Route with fewer than 2 coordinate points is not drawn
    Given a route whose geoJson LineString has only 1 coordinate
    When the map renders
    Then no polyline is drawn for that route

  # ──────────────────────────────────────────────
  # INTERACTIVE vs READ-ONLY
  # ──────────────────────────────────────────────

  Scenario: Interactive map calls onRouteSelect on polyline click
    Given RoutesMap rendered with interactive=true and onRouteSelect handler
    When the user clicks the polyline for route id 42
    Then onRouteSelect is called with 42

  Scenario: Read-only map does not call onRouteSelect
    Given RoutesMap rendered with interactive=false
    When the user clicks a polyline
    Then onRouteSelect is never called

  # ──────────────────────────────────────────────
  # SSR SAFETY
  # ──────────────────────────────────────────────

  Scenario: RoutesMap renders a placeholder during SSR
    When RoutesMap is rendered in a Node.js (SSR) environment
    Then a <div> placeholder is rendered without errors
    And no reference to window or document occurs during SSR
