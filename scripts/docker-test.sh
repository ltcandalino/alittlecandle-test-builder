#!/usr/bin/env bash
# Builds the Docker image on this computer and checks that it works:
# the website loads, the first admin can sign in, and accounts survive a restart.
#
#   ./scripts/docker-test.sh          build, test, clean up
#   KEEP=1 ./scripts/docker-test.sh   leave it running so you can try it at http://localhost:8088
#
# Everything printed is also saved to tests/out/docker-test.log.
set -u
cd "$(dirname "$0")/.."
mkdir -p tests/out
LOG=tests/out/docker-test.log
exec > >(tee "$LOG") 2>&1

IMAGE=alittlecandle-testbuilder:dev
NAME=alctb-test
VOL=alctb-test-data
PORT=${PORT:-8088}
EMAIL=test@example.com
PASS=test-password-123
URL="http://localhost:$PORT"
FAILS=0

say()  { printf '\n== %s\n' "$*"; }
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; FAILS=$((FAILS+1)); }
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1; docker volume rm "$VOL" >/dev/null 2>&1; }

wait_up() {
  for _ in $(seq 1 30); do
    curl -fsS "$URL/healthz" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}
login() {
  curl -sS -X POST "$URL/auth/v1/token?grant_type=password" \
    -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
}
token_of() { sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'; }

say "Docker"
if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Open Docker Desktop, wait until it says it's running, and try again."
  exit 1
fi
docker version --format 'Client {{.Client.Version}} / Server {{.Server.Version}} ({{.Server.Os}}/{{.Server.Arch}})'

say "Build the app pages"
if command -v python3 >/dev/null 2>&1; then
  python3 build.py || { fail "build.py"; exit 1; }
else
  echo "python3 not found; using the committed docker/index.html"
fi

say "Build the image"
START=$(date +%s)
if docker build --build-arg APP_VERSION="$(cat VERSION)" -t "$IMAGE" docker; then
  pass "image built in $(( $(date +%s) - START ))s, size $(docker image inspect "$IMAGE" --format '{{.Size}}' | awk '{printf "%.0f MB", $1/1000000}')"
else
  fail "docker build"; exit 1
fi

say "Start a test container on $URL"
cleanup
docker run -d --name "$NAME" -p "$PORT:8080" -v "$VOL:/data" \
  -e ADMIN_EMAIL="$EMAIL" -e ADMIN_PASSWORD="$PASS" "$IMAGE" >/dev/null || { fail "docker run"; exit 1; }
if wait_up; then pass "server answered /healthz"; else fail "server didn't start"; docker logs "$NAME"; cleanup; exit 1; fi

say "Checks"
curl -fsS "$URL/" | grep -q ALittleCandleTestBuilder && pass "website loads" || fail "website"
curl -fsS "$URL/config.js" | grep -q selfHosted && pass "config.js says self-hosted" || fail "config.js"
WANT=$(cat VERSION)
curl -fsS "$URL/healthz" | grep -q "\"version\":\"$WANT\"" && pass "server reports version $WANT" || fail "version (expected $WANT)"
TOKEN=$(login | token_of)
[ -n "$TOKEN" ] && pass "admin can sign in" || fail "admin sign-in"
curl -fsS "$URL/auth/v1/user" -H "Authorization: Bearer $TOKEN" | grep -q "$EMAIL" && pass "signed-in user is $EMAIL" || fail "user lookup"
curl -sS -o /dev/null -w '%{http_code}' -X POST "$URL/auth/v1/token?grant_type=password" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"wrong-password\"}" | grep -q 400 \
  && pass "wrong password is refused" || fail "wrong password check"
curl -fsS "$URL/admin/api/users" -H "Authorization: Bearer $TOKEN" | grep -q "$EMAIL" && pass "admin can list accounts" || fail "admin account list"

say "Restart and check the account is still there"
docker restart "$NAME" >/dev/null
if wait_up && [ -n "$(login | token_of)" ]; then pass "sign-in works after restart (data kept in volume)"; else fail "data after restart"; fi

say "Docker health check"
for _ in $(seq 1 45); do
  H=$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null)
  [ "$H" = healthy ] && break
  sleep 1
done
[ "$H" = healthy ] && pass "container reports healthy" || fail "health status: $H"

say "Server log"
docker logs "$NAME" 2>&1 | tail -n 15

if [ "${KEEP:-}" = 1 ]; then
  say "Left running"
  echo "Open $URL and sign in as $EMAIL / $PASS"
  echo "Stop it later with: docker rm -f $NAME && docker volume rm $VOL"
else
  cleanup
fi

say "Result"
if [ "$FAILS" -eq 0 ]; then echo "All Docker checks passed."; else echo "$FAILS check(s) failed. See $LOG"; exit 1; fi
