# End-to-End Tests

Playwright-based end-to-end tests for PlantsPack.

## Setup

Tests are already configured. Playwright was installed as a dev dependency.

### Test User Credentials

A dedicated test user is configured for authenticated tests:
- **Email**: e2e.test@plantspack.com
- **Password**: TestPassword123!

These credentials are stored in `.env.test` and are safe for public repositories as they're only for testing purposes.

**Important**: Before running tests for the first time, ensure the test user exists in your Supabase database. If you're running against production, the user should already exist. For local testing, you may need to sign up this user manually at `/auth`.

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
- Navigate to place from map
- Review form visible for authenticated users
- External map links (Google Maps, Apple Maps)

### 4. Packs (04-packs.spec.ts)
- Packs listing page
- Pack detail page with tabs (Posts, Places, Members)
- Tab switching functionality
- Navigation between packs

### 5. Authentication (05-authentication.spec.ts)
- Auth page loads
- Form validation
- Sign-in flow (tested in auth.setup.ts)

## Environment Variables

Test environment variables are configured in `.env.test`:

```bash
# .env.test (committed to repo)
TEST_USER_EMAIL=e2e.test@plantspack.com
TEST_USER_PASSWORD=TestPassword123!
PLAYWRIGHT_BASE_URL=https://plantspack.com
```

You can override these for local testing by creating `.env.test.local` (not committed to repo).

## Authentication

Tests automatically authenticate using the test user credentials before running authenticated test suites. The authentication setup:

1. **Setup Project** (`e2e/auth.setup.ts`): Runs first, signs in the test user, and saves the authentication state
2. **Authenticated Tests**: Use the saved authentication state for tests that require a signed-in user
3. **Unauthenticated Tests**: Homepage and public pages run without authentication

The authentication state is saved to `e2e/.auth/user.json` (not committed to repo).

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
