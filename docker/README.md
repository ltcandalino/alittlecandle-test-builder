# ALittleCandleTestBuilder — Docker

Everything runs in one container on your server:

- the website
- sign-ins for you and your colleagues (each person has private banks)
- the question banks, tests and pictures, saved on your server

There's no outside service and nothing to sign up for. A second, small container (**Caddy**) adds HTTPS so passwords travel safely.

## What you need

- A VPS or server with **Docker** and **Docker Compose** (any Linux VPS works: DigitalOcean, Linode, Hetzner, etc.)
- A web address you control, like `tests.yourdomain.com`
- About 15 minutes

## 1. Point your web address at the server

At your domain/DNS provider, add an **A record**:

| Name | Value |
|---|---|
| `tests` (or whatever you like) | your server's IP address |

DNS can take a few minutes to update.

## 2. Copy this folder to the server

Copy these files into a folder on the server, such as `~/alittlecandle`:

```
Dockerfile
docker-compose.yml
Caddyfile
server.js
index.html
```

For example, from your computer: `scp -r alittlecandle/ you@your-server:~/`

## 3. Fill in three things

In **docker-compose.yml**:

- `ADMIN_EMAIL`: the email you'll sign in with
- `ADMIN_PASSWORD`: your first password (8+ characters). It's only used the very first time the site starts; change it later from the site.

In **Caddyfile**: replace `tests.yourdomain.com` with your web address.

## 4. Start it

In that folder on the server:

```
docker compose up -d --build
```

After a minute, open `https://tests.yourdomain.com` and sign in.

## 5. Add your colleagues

Click your email at the top right → **Manage accounts**. Type their email, click **Make one up** for a temporary password (or type one), and click **Add**. Send them the address, their email, and the temporary password. They can change it from the menu under their email.

You can also reset passwords, make someone an admin, or delete an account there.

## 6. Bring in the banks you already made

Open your current ALittleCandleTestBuilder → **Import & backup** → **Download backup**. Then sign in on the new site → **Import & backup** → **Restore a backup**. Each colleague does the same with their own backup.

---

## Everyday notes

- **☁ Synced** at the top means your latest changes are saved on the server. If the internet drops, keep working; it catches up when you're back online.
- **Original files** (.bnk, .pdf, .docx) can stay on your NAS. Choose them from the NAS folder when you import.
- **Signing out** removes the copy kept in that browser, which is good for shared school computers.
- **Forgot password:** there are no reset emails. An admin resets it under Manage accounts.

## Updating

When you get a new `index.html` (or `server.js`), replace the file in the folder and run:

```
docker compose up -d --build
```

Your accounts and banks are kept; they live in the `alctb-data` volume, not in the container.

### Using the image GitHub builds

When this repo is on GitHub, every change to the main branch builds a fresh image at
`ghcr.io/ltcandalino/alittlecandle-test-builder:latest` (see `.github/workflows/docker.yml`).
Then the server only needs `docker-compose.yml` and `Caddyfile`:

1. In `docker-compose.yml`, delete `build: .` and `image: alittlecandle-testbuilder`, and uncomment the `ghcr.io/...` image line.
2. GitHub keeps new images private. Either make the package public (GitHub → your profile → **Packages** → the package → **Package settings** → **Change visibility**), or sign the server in once with `docker login ghcr.io`.
3. To update: `docker compose pull && docker compose up -d`.

Version tags work too: pushing a tag like `v1.2.0` publishes `:1.2.0` and `:1.2`, so you can pin the server to a version.

## Choosing the database: SQLite, PostgreSQL or MySQL/MariaDB

Out of the box, accounts, banks and settings are kept in **SQLite**, a single file (`alctb.db`) in the
`alctb-data` volume. Nothing to set up, and it's plenty for a school.

To use **PostgreSQL** (preferred) or **MySQL / MariaDB** instead, set `DATABASE_URL` for the app:

| Database | `DATABASE_URL` |
|---|---|
| SQLite (default) | leave it out |
| PostgreSQL | `postgres://user:password@host:5432/alctb` |
| MySQL | `mysql://user:password@host:3306/alctb` |
| MariaDB | `mariadb://user:password@host:3306/alctb` |

The database (`alctb` above) must already exist and the user must be allowed to create tables in it. The
tables are created on the first start. Pictures always stay as files in the `alctb-data` volume, so keep
that volume whichever database you choose.

**Easiest: run the database next to the app.** Two ready-made add-on files start one for you:

```
docker compose -f docker-compose.yml -f compose.postgres.yml up -d
docker compose -f docker-compose.yml -f compose.mariadb.yml up -d
```

Change the passwords in the add-on file first. Use the same `-f …` options for every later
`docker compose` command (`pull`, `up -d`, `logs`, `down`).

**Already have a database server?** Create an empty database and a user for it, then set `DATABASE_URL`
under `app:` → `environment:` in `docker-compose.yml`.

**Moving from SQLite:** just switch. On the first start with an empty PostgreSQL / MySQL / MariaDB
database, the app copies every account, question and setting from the old `alctb.db` once, and leaves the
file as it was. The log shows `Copied N account(s) and M question(s)`. Download a backup first anyway.

If the database server is still starting, the app waits for it (`Waiting for the database to accept
connections…` in the log).

## Backing up the server

With the default SQLite, this saves everyone's accounts, banks and pictures into one file in the current folder:

```
docker compose stop app
docker run --rm -v alittlecandle_alctb-data:/data -v "$PWD":/backup alpine tar czf /backup/alctb-backup-$(date +%F).tgz -C /data .
docker compose start app
```

The volume name starts with the folder name (`alittlecandle_` above). Run `docker volume ls` to check it.

To restore onto a new server, create the volume by starting the site once, stop the app, then:

```
docker run --rm -v alittlecandle_alctb-data:/data -v "$PWD":/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/alctb-backup-DATE.tgz -C /data && chown -R 1000:1000 /data"
docker compose start app
```

With PostgreSQL or MySQL/MariaDB, back up the `alctb-data` volume the same way (for the pictures) and the
database with its own tool, for example:

```
docker compose -f docker-compose.yml -f compose.postgres.yml exec db pg_dump -U alctb alctb > alctb-$(date +%F).sql
docker compose -f docker-compose.yml -f compose.mariadb.yml exec db sh -c 'mariadb-dump -ualctb -p"$MARIADB_PASSWORD" alctb' > alctb-$(date +%F).sql
```

## If you're locked out of the admin account

In `docker-compose.yml`, set a new `ADMIN_PASSWORD`, uncomment `ADMIN_RESET: "1"`, and run `docker compose up -d`. Sign in with the new password, then comment `ADMIN_RESET` out again and run `docker compose up -d` once more.

## Behind your own proxy (HTTPS handled elsewhere)

Already have a web server or reverse proxy on ports 80/443 (nginx, Apache, Nginx Proxy Manager, Traefik,
Caddy, a cPanel proxy) that handles HTTPS? You don't need the bundled Caddy. The app speaks plain HTTP on
port **8080**, and your proxy forwards to it.

**1. `docker-compose.yml`:** delete the `caddy:` section and the `caddy-data` / `caddy-config` volumes, and
publish the app's port:

```yaml
services:
  app:
    image: ghcr.io/ltcandalino/alittlecandle-test-builder:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:8080"   # proxy on the same machine
    environment:
      ADMIN_EMAIL: you@yourschool.org
      ADMIN_PASSWORD: change-this-password
    volumes:
      - alctb-data:/data
volumes:
  alctb-data:
```

If the proxy runs on a **different machine**, publish on this machine's network address instead (for example
`"192.168.1.20:8080:8080"`), and make sure **only the proxy** can reach port 8080 (a firewall rule, or a
private network between the two). If the proxy is another container, you can skip `ports:` entirely and put
both containers on the same Docker network, then forward to `http://app:8080`.

> **Why only the proxy:** the app trusts the `X-Forwarded-For` header to know who is signing in. That's how
> it pauses sign-ins after too many wrong passwords. Anyone who could reach port 8080 directly could fake
> that header.

**2. Point the proxy at it.** It needs to:

- **forward `X-Forwarded-For`** with the visitor's address (most proxies do this on their own);
- **allow uploads up to 25 MB**, since question pictures go through it (nginx's default is only 1 MB);
- **stay HTTPS-only**, so passwords never travel unencrypted.

nginx:

```nginx
server {
    listen 443 ssl;
    server_name tests.yourdomain.com;
    # ssl_certificate / ssl_certificate_key: your existing certificate

    client_max_body_size 25m;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Apache (with `mod_proxy` and `mod_proxy_http`; Apache adds `X-Forwarded-For` itself):

```apache
<VirtualHost *:443>
    ServerName tests.yourdomain.com
    # SSLEngine on / SSLCertificateFile …: your existing certificate
    LimitRequestBody 26214400
    ProxyPreserveHost On
    ProxyPass        / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/
</VirtualHost>
```

Caddy elsewhere: `tests.yourdomain.com { reverse_proxy 127.0.0.1:8080 }`. **Nginx Proxy Manager:** forward
to the app's address and port 8080, turn on SSL, and add `client_max_body_size 25m;` under the host's
**Advanced** tab. **Traefik** forwards the header and allows large uploads by default.

**3. Start and check:**

```
docker compose up -d
```

Open `https://tests.yourdomain.com/healthz`. It should show the version. Then sign in at your address.

## Security updates

Every image GitHub builds is scanned for known vulnerabilities before it's published, and the image is
rebuilt and scanned again every Monday, so it picks up fixes in the base system. To get them on your
server, update it (see **Updating**). The results are on GitHub under **Security → Code scanning**.

To scan the image yourself with Docker's free scanner:

```
docker scout cves ghcr.io/ltcandalino/alittlecandle-test-builder:latest
```

## Details

- One container, Node 26 (current LTS). Data: SQLite in `/data` by default, or PostgreSQL / MySQL / MariaDB through `DATABASE_URL`; pictures are files in `/data/images`. The only packages are the database drivers (`pg`, `mysql2`), loaded only when used.
- Passwords are stored scrambled (scrypt), never as plain text. Sign-ins expire after 60 days of not using the site.
- Too many wrong passwords in a row pause sign-in for that email for 15 minutes.
- Health check: `https://tests.yourdomain.com/healthz`
