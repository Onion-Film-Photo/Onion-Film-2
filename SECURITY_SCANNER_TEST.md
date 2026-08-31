# Hacktron intentional vulnerability test

This branch contains one intentionally vulnerable test case: a hard-coded dummy API key in `app/api/hacktron-test/route.ts`.

The value is synthetic. It is not a credential for GitHub, Supabase, this app, or any external service. The route reads no application data and makes no external requests.

## Expected scanner result

Hacktron should report the `HACKTRON_TEST_API_KEY` constant as a hard-coded secret or credential. The nearby `INTENTIONALLY VULNERABLE` comments mark the finding as test-only.

## Local runtime check

The route is disabled by default. To enable it locally:

```sh
ENABLE_HACKTRON_TEST_ROUTE=true npm run dev
```

In a second terminal, copy the dummy value declared as `HACKTRON_TEST_API_KEY` in the route and run:

```sh
curl -i -H 'x-hacktron-test-key: <dummy value from route.ts>' http://localhost:3000/api/hacktron-test
```

Expected behavior:

- Without `ENABLE_HACKTRON_TEST_ROUTE=true`: HTTP 404.
- With the route enabled but without the header: HTTP 401.
- With the route enabled and the dummy header value: HTTP 200 with a harmless JSON response.

## Removal

If the test is committed, remove it cleanly with:

```sh
git revert <test-commit-sha>
```

Do not deploy this route or replace the dummy value with a real secret.
