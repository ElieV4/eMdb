# Cypress E2E Scenarios — Phase 2 — Search & Navigation

> These scenarios are documented for manual testing only. They are not executed in CI
> (too slow). Run them locally with `npm run test:e2e` from `apps/web`.

## Prerequisites

- Backend API running (`npm run start:dev --workspace=apps/api`)
- Frontend dev server running (`npm run dev` from `apps/web`)

## Scenarios

### 1. Homepage loads (header, footer, CTA)
- **Steps**: Visit `/`
- **Assert**: Header is visible, footer is visible, CTA buttons ("Se connecter", "S'inscrire") are displayed for unauthenticated users

### 2. Homepage dashboard for authenticated users
- **Steps**: Login, visit `/`
- **Assert**: Statistics section, continue watching section, followed series section, popular titles section are visible

### 3. Search page loads with tabs
- **Steps**: Visit `/search`
- **Assert**: Search input is visible, tabs (Tout, Films, Séries, Personnes) are rendered

### 4. Search returns results for a query
- **Steps**: Type "inception" in the search input, wait for results
- **Assert**: TitleCard or PersonCard results appear in the grid

### 5. Genre/country/year filters work
- **Steps**: Select a genre filter, apply it
- **Assert**: Results are filtered accordingly

### 6. Pagination works
- **Steps**: Navigate to page 2, 3, etc.
- **Assert**: Results change to the requested page

### 7. Clicking a TitleCard navigates to `/titles/:id`
- **Steps**: Click on a TitleCard in search results
- **Assert**: URL changes to `/titles/:id`, page loads with title details

### 8. Clicking a PersonCard navigates to `/people/:id`
- **Steps**: Click on a PersonCard in search results
- **Assert**: URL changes to `/people/:id`, page loads with person details

### 9. TitleSearchBar autocomplete with keyboard navigation
- **Steps**: Type a query in the header search bar, use ↑↓ to navigate suggestions, press Enter
- **Assert**: Navigation occurs to the selected suggestion's page

### 10. Custom 404 for nonexistent routes
- **Steps**: Visit `/nonexistent-route`
- **Assert**: Custom 404 page is displayed

### 11. Loading spinner displays during search
- **Steps**: Type a query in search, observe while results load
- **Assert**: Loading spinner or loading message appears during the request

### 12. Empty state for zero results
- **Steps**: Search for a non-existent term (e.g., "xyzabc123")
- **Assert**: "Aucun résultat trouvé" message is displayed