# End-to-End Tests

Playwright-based end-to-end tests for PlantsPack.

## Setup

Tests are already configured. Playwright was installed as a dev dependency.

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test e2e/01-homepage.spec.ts
```

### Run tests in UI mode (recommended for development)
```bash
npx playwright test --ui
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Generate test report
```bash
npx playwright show-report
```

## Test Coverage

### 1. Homepage and Navigation (01-homepage.spec.ts)
- Homepage loads correctly
- Navigation to key pages (map, packs)

### 2. Map and Places (02-map-and-places.spec.ts)
- Map loads and displays markers
- Category filtering
- Navigation to place details

### 3. Place Details (03-place-details.spec.ts)
- Place detail page displays correctly
- Reviews section visible
- Sign-in prompt for non-authenticated users

### 4. Packs (04-packs.spec.ts)
- Packs listing page
- Pack detail page with tabs (Posts, Places, Members)
- Navigation between packs

### 5. Authentication (05-authentication.spec.ts)
- Auth page loads
- Form validation
- Sign-in flow (requires credentials)

## Environment Variables

For tests that require authentication or specific IDs:

```bash
# .env.test (optional)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
TEST_PLACE_ID=some-place-id
TEST_PACK_ID=some-pack-id
PLAYWRIGHT_BASE_URL=https://plantspack.com
```

## Skipped Tests

Some tests are marked with `test.skip()` because they require:
- Valid authentication credentials
- Specific database IDs
- Authenticated user state

These can be run manually when needed with proper setup.

## CI/CD Integration

Tests are configured to run on-demand only, not automatically on build.

To add to CI:
```yaml
- name: Run E2E Tests
  run: npx playwright test
  env:
    PLAYWRIGHT_BASE_URL: ${{ secrets.STAGING_URL }}
```

## Notes

- Tests run against production by default (`https://plantspack.com`)
- Can be configured to run against localhost or staging
- Tests are high-level and don't go deep into specific features
- Focus on main user journeys and critical paths
