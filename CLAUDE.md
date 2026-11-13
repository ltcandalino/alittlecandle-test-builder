# Notes for working on this repo

- Edit code in `src/`, then run `python3 build.py`. Commit the rebuilt
  `ALittleCandleTestBuilder.html` and `docker/index.html` together with the source change.
- Every change gets a line in `CHANGELOG.md` under **[Unreleased]** (Added / Changed / Fixed / Removed).
- Update `README.md` (and `docker/README.md` when the server changes) for any significant change:
  new features, new settings, new setup steps.
- Keep the user guide in `wiki/` current: change the matching page whenever a feature, setting or
  button label changes. `wiki.yml` publishes it to the GitHub wiki; never edit the wiki on GitHub.
- Releases: move Unreleased notes under a new version + date, commit, tag `vX.Y.Z`.
  Pushing the tag to GitHub publishes the Docker image via `.github/workflows/docker.yml`.
- Print layouts are checked against the user's Word templates (Exam, Unit Review, Lesson).
- Test in Chrome: headers/footers use @page margin boxes (Chrome/Edge 131+).
- The user is a math teacher, not a developer: explain changes in plain language.
