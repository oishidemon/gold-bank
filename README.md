# Gold Bank

NestJS + TypeORM + Postgres API that also serves the static UI (`apps/web`).

## Run (Docker)
    cp .env.example .env        # set APP_PASSWORD
    docker compose up --build
    # http://localhost:3000

## Local dev
    npm install
    npm run db                  # postgres only
    npm run dev                 # http://localhost:3000

## Tests
Unit (no DB needed):

    npm run test:unit

Integration (real Postgres; tables are TRUNCATED, so use a throw-away database):

    docker compose up -d db
    docker compose exec db createdb -U bank bank_test
    # PowerShell: $env:TEST_DATABASE_URL="postgres://bank:<DB_PASSWORD>@localhost:5432/bank_test"
    npm test

## CI/CD (`.github/workflows/ci.yml`)
- `app`: lint (blocking) -> build -> test (unit + integration against a Postgres service), npm cache on.
- `image`: builds the root Dockerfile locally on the runner (no push) and scans it with Trivy (blocking). Needs `app`.
- `publish`: only on `push`. Logs in to GHCR with `GITHUB_TOKEN`, pushes `ghcr.io/<owner>/<repo>:<commit-sha>`
  and `:latest` (default branch only).

Pull and run a published image:

    docker pull ghcr.io/<owner>/<repo>:latest

Branch protection (Settings -> Branches -> rule for `main`): require a pull request,
require status checks `app` and `image`.
