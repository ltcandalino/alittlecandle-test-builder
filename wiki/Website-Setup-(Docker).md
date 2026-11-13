# Website Setup (Docker)

The `docker/` folder runs ALittleCandleTestBuilder as a website on your web hosting or VPS, with a login for you and each colleague. Everything (the website, accounts, banks and pictures) runs in one container. A second container, **Caddy**, provides HTTPS.

The full step-by-step guide is in [`docker/README.md`](../blob/HEAD/docker/README.md). In short:

1. **Point a web address** (like `tests.yourschool.org`) at your server with an A record.
2. **Copy** the `docker/` folder to the server.
3. In `docker-compose.yml`, set **ADMIN_EMAIL** and **ADMIN_PASSWORD** (used only the first time). In `Caddyfile`, put your web address.
4. Run `docker compose up -d --build`.
5. Sign in, then use your email menu → **Manage accounts** to add colleagues with temporary passwords.

## Using the image GitHub builds

Every change to the main branch builds an image at `ghcr.io/<owner>/alittlecandle-test-builder:latest`. Tags like `v1.2.0` publish `:1.2.0` too. To use it, replace `build: .` in `docker-compose.yml` with that image, then update with:

```
docker compose pull && docker compose up -d
```

GitHub keeps new images private: make the package public, or run `docker login ghcr.io` on the server once.

## Accounts

- Admins add, reset and remove accounts under **Manage accounts**. There are no reset emails.
- Everyone can change their own password from the menu under their email.
- Locked out as admin? Set `ADMIN_RESET: "1"` and a new `ADMIN_PASSWORD`, restart, sign in, then remove `ADMIN_RESET`.

## Your data

Accounts, banks and pictures live in the `alctb-data` Docker volume, so updating the container keeps them. Back up that volume (see `docker/README.md`).
