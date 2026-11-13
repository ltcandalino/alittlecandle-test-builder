# ALittleCandleTestBuilder

> The `index.html` for this setup is the same file as `docker/index.html` (run `python3 build.py` to make it). Rename `config.example.js` to `config.js` and fill in your keys.

Build tests from your question banks (ExamView, Word, PDF), print versions with answer keys, and keep everything in your own account so it follows you to any computer.

This site has two parts:

- **The website** (these files) is hosted free on **GitHub Pages**.
- **Logins and saved questions** live in a free **Supabase** project that you own.

Setup takes about 20 minutes, once.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign up (free), and click **New project**.
2. Name it `alittlecandle`, pick a database password (save it somewhere), choose the region **East US**, and click **Create**. Wait a minute or two.
3. In the left menu open **SQL Editor** → **New query**. Open `setup.sql` from this repository, copy everything, paste it in, and click **Run**. You should see "Success".

## 2. Turn off public sign-ups

So that only people you add can get in:

1. Left menu → **Authentication** → **Sign In / Providers**.
2. Turn **off** "Allow new users to sign up". Leave the **Email** provider turned on.

## 3. Add yourself and your colleagues

1. Left menu → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Type the email and a temporary password, check **Auto Confirm User**, and click **Create user**.
3. Repeat for each colleague. Each person gets their own private banks.

Everyone can change their password after signing in: click their email at the top right → **Change password**.

## 4. Copy your two keys into `config.js`

1. Left menu → **Project Settings** → **API** (in newer projects: **Data API** for the URL and **API Keys** for the key).
2. Copy the **Project URL** and the **anon public** key (newer projects call it the **publishable** key, starting `sb_publishable_`).
3. Open `config.js` in this repository (on GitHub, click the file, then the pencil icon), paste them in place of the placeholder text, and click **Commit changes**.

These two values are designed to be public. Your questions stay private because the database only lets each signed-in person see their own.

## 5. Publish on GitHub Pages

1. In this repository: **Settings** → **Pages**.
2. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and click **Save**.
3. After a minute, the address appears at the top of that page, like `https://YOUR-NAME.github.io/ALittleCandleTestBuilder/`. Bookmark it.

Free GitHub Pages needs the repository to be **public**. That only makes the website code public. Your questions, banks and tests are stored in Supabase, not here.

## 6. Let password-reset emails link back to your site

Supabase → **Authentication** → **URL Configuration** → set **Site URL** to your GitHub Pages address and click **Save**.

## 7. Bring in the banks you already made

Banks you built in the stand-alone file live in that browser, not online yet. To move them:

1. Open the old `ALittleCandleTestBuilder.html` the way you always did → **Import & backup** → **Download backup**.
2. Open your new site, sign in → **Import & backup** → **Restore a backup** and choose that file.

They upload to your account, and you'll see "☁ Synced" at the top when they're done.

---

## Everyday use

- **The ☁ label at the top** shows whether your latest changes are online: "Synced", "Changes waiting to sync", or "Offline — will sync later". You can keep working offline; changes upload when you're back online.
- **Your original files** (.bnk, .pdf, .docx) can stay on your NAS. When importing, just choose them from the NAS folder in the file window. Once imported, the questions are in your account.
- **Signing out** removes the copy kept in that browser, which is good for shared school computers. Your questions stay in your account.

## Good to know

- **Free-plan limits:** about 500 MB of questions and 1 GB of pictures, which is many years of tests for a few teachers.
- **Inactive projects get paused.** Supabase pauses free projects after about a week with no use (for example, over the summer). If the site says it can't connect, sign in to supabase.com and click **Restore project**. Nothing is lost.
- **Backups:** Import & backup → Download backup still works anytime. Keeping one in Google Drive each marking period is a good habit.
- **Password-reset emails:** the free plan sends only a few per hour. If a colleague is locked out, you can also set a new password for them under Authentication → Users.

## Updating the site

When you get a new `index.html`, open it on GitHub → **Add file** → **Upload files**, drop in the new `index.html`, and commit. Don't replace `config.js`; it holds your keys.
