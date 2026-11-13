# Website Setup (Docker)

The `docker/` folder runs ALittleCandleTestBuilder as a website on your web hosting or VPS, with a login for you and each colleague. Everything (the website, accounts, banks and pictures) runs in one container. A second container, **Caddy**, provides HTTPS.

The full step-by-step guide is in [`docker/README.md`](../blob/HEAD/docker/README.md). In short:

1. **Point a web address** (like `tests.yourschool.org`) at your server with an A record.
2. **Copy** `docker-compose.yml` and `Caddyfile` from the `docker/` folder to the server.
3. In `docker-compose.yml`, set **ADMIN_EMAIL** and **ADMIN_PASSWORD** (used only the first time). In `Caddyfile`, put your web address.
4. Run `docker compose up -d`. Docker downloads the ready-made image from GitHub.
5. Sign in, then use your email menu → **Manage accounts** to add colleagues with temporary passwords.

## Which database?

Accounts, banks and settings are kept in **SQLite** inside the `alctb-data` volume unless you choose
otherwise. To use **PostgreSQL** (preferred) or **MySQL / MariaDB**, set `DATABASE_URL`, or start with a
ready-made add-on: `docker compose -f docker-compose.yml -f compose.postgres.yml up -d`
(or `compose.mariadb.yml`). Switching from SQLite copies your existing data over automatically on the first
start. Details: **Choosing the database** in [`docker/README.md`](../blob/HEAD/docker/README.md).

## Already have a proxy that handles HTTPS?

Leave out the bundled Caddy and forward your proxy (nginx, Apache, Nginx Proxy Manager, Traefik…) to the app on
port **8080**. Let only the proxy reach that port, pass `X-Forwarded-For`, and allow uploads up to 25 MB. Step by
step, with nginx and Apache examples: **Behind your own proxy** in
[`docker/README.md`](../blob/HEAD/docker/README.md#behind-your-own-proxy-https-handled-elsewhere).

## Updating and versions

`docker-compose.yml` uses the ready-made image `ghcr.io/ltcandalino/alittlecandle-test-builder:latest`.
To update the server:

```
docker compose pull && docker compose up -d
```

To stay on one version, change `:latest` to a version like `:0.7.0`. Check the version number next to the
app's name after updating.

**Still seeing an old version after updating?** If `docker-compose.yml` has a `build: .` line, Docker
builds the app from the files in that folder instead of downloading it. Delete the `build: .` line, then
run the update again.

## Accounts

- Admins add, reset and remove accounts under **Manage accounts**. There are no reset emails.
- Everyone can change their own password from the menu under their email.
- Locked out as admin? Set `ADMIN_RESET: "1"` and a new `ADMIN_PASSWORD`, restart, sign in, then remove `ADMIN_RESET`.

## Your data

Accounts, banks and pictures live in the `alctb-data` Docker volume, so updating the container keeps them. Back up that volume (see `docker/README.md`).
