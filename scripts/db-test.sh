#!/usr/bin/env bash
# Runs the server and sync tests against real PostgreSQL, MariaDB and MySQL servers in Docker.
#   npm run test:db              all three
#   DBS="postgres" npm run test:db   just one (postgres, mariadb, mysql)
# Needs Docker running. The database containers are removed afterwards.
set -u
cd "$(dirname "$0")/.."
[ -d docker/node_modules/pg ] || npm install --prefix docker --no-audit --no-fund >/dev/null
DBS="${DBS:-postgres mariadb mysql}"
PW=test-pass-1
FAILED=""
started=()
cleanup() { for c in "${started[@]}"; do docker rm -f "$c" >/dev/null 2>&1; done; }
trap cleanup EXIT

wait_for() { # name, command
  for _ in $(seq 1 60); do docker exec "$1" sh -c "$2" >/dev/null 2>&1 && return 0; sleep 2; done
  echo "  $1 did not start"; docker logs --tail 20 "$1"; return 1
}

for db in $DBS; do
  name="alctb-test-$db-$$"
  case "$db" in
    postgres)
      docker run -d --name "$name" -e POSTGRES_PASSWORD=$PW -p 127.0.0.1::5432 postgres:18 >/dev/null || exit 1
      started+=("$name"); wait_for "$name" "pg_isready -U postgres" || { FAILED="$FAILED $db"; continue; }
      port=$(docker port "$name" 5432 | head -1 | sed 's/.*://'); url="postgres://postgres:$PW@127.0.0.1:$port/postgres" ;;
    mariadb)
      docker run -d --name "$name" -e MARIADB_ROOT_PASSWORD=$PW -p 127.0.0.1::3306 mariadb:lts >/dev/null || exit 1
      started+=("$name"); wait_for "$name" "healthcheck.sh --connect --innodb_initialized" || { FAILED="$FAILED $db"; continue; }
      port=$(docker port "$name" 3306 | head -1 | sed 's/.*://'); url="mariadb://root:$PW@127.0.0.1:$port/mysql" ;;
    mysql)
      docker run -d --name "$name" -e MYSQL_ROOT_PASSWORD=$PW -p 127.0.0.1::3306 mysql:lts >/dev/null || exit 1
      started+=("$name"); wait_for "$name" "mysql -uroot -p$PW -h127.0.0.1 -e 'SELECT 1'" || { FAILED="$FAILED $db"; continue; }
      port=$(docker port "$name" 3306 | head -1 | sed 's/.*://'); url="mysql://root:$PW@127.0.0.1:$port/mysql" ;;
    *) echo "Unknown database: $db"; exit 1 ;;
  esac
  echo "== $db ($(docker inspect -f '{{.Config.Image}}' "$name"))"
  mkdir -p tests/out; log="tests/out/db-test-$db.log"
  TEST_DATABASE_URL="$url" node --test --test-concurrency=1 tests/server.test.cjs tests/sync.test.cjs >"$log" 2>&1 || FAILED="$FAILED $db"
  grep -E '^ℹ (tests|pass|fail|skipped)|^✖|AssertionError|Error:' "$log" | head -20
done

if [ -n "$FAILED" ]; then echo "FAILED on:$FAILED"; exit 1; fi
echo "All database tests passed."
