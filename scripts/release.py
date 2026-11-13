#!/usr/bin/env python3
"""Make a release: set VERSION, turn [Unreleased] in CHANGELOG.md into a dated version, rebuild, commit, tag.

    python3 scripts/release.py 0.6.0          # make release 0.6.0
    python3 scripts/release.py minor          # bump: major | minor | patch
    python3 scripts/release.py 0.6.0 --dry-run

Semantic versioning (https://semver.org):
    MAJOR  something that breaks saved data, backups or the server setup
    MINOR  new features (new document type, new import, new setting)
    PATCH  fixes only

Then push the branch and the tag:  git push && git push origin vX.Y.Z
Pushing the tag publishes the GitHub Release (with notes from the changelog) and the Docker image.
"""
import datetime
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEMVER = re.compile(r'^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$')


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(os.path.join(ROOT, p), 'w', encoding='utf-8') as f:
        f.write(s)


def run(*cmd):
    print('$', ' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT, check=True)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry-run' in sys.argv
    if len(args) != 1:
        print(__doc__)
        sys.exit(1)
    cur = read('VERSION').strip()
    m = SEMVER.match(cur)
    major, minor, patch = int(m[1]), int(m[2]), int(m[3])
    new = {'major': f'{major + 1}.0.0', 'minor': f'{major}.{minor + 1}.0', 'patch': f'{major}.{minor}.{patch + 1}'}.get(args[0], args[0])
    if not SEMVER.match(new):
        sys.exit(f'"{new}" is not a semantic version like 1.2.3')
    if tuple(map(int, SEMVER.match(new).groups()[:3])) <= (major, minor, patch) and not SEMVER.match(new)[4]:
        sys.exit(f'{new} must be newer than the current version {cur}')

    log = read('CHANGELOG.md')
    sec = re.search(r'## \[Unreleased\]\n(.*?)(?=\n## \[)', log, re.S)
    if not sec or not sec.group(1).strip():
        sys.exit('CHANGELOG.md has nothing under [Unreleased]. Add the release notes first.')
    if f'## [{new}]' in log:
        sys.exit(f'CHANGELOG.md already has a section for {new}')
    today = datetime.date.today().isoformat()
    log = log.replace('## [Unreleased]\n', f'## [Unreleased]\n\n## [{new}] - {today}\n', 1)

    print(f'Release {cur} → {new} ({today})')
    print(sec.group(1).strip())
    if dry:
        print('\n(dry run: nothing changed)')
        return
    write('CHANGELOG.md', log)
    write('VERSION', new + '\n')
    run(sys.executable, 'build.py')
    run('git', 'add', 'VERSION', 'CHANGELOG.md', 'ALittleCandleTestBuilder.html', 'docker/index.html')
    run('git', 'commit', '-m', f'Release v{new}')
    run('git', 'tag', '-a', f'v{new}', '-m', f'ALittleCandleTestBuilder v{new}')
    print(f'\nDone. Now run:  git push && git push origin v{new}')


if __name__ == '__main__':
    main()
