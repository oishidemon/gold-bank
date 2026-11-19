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
