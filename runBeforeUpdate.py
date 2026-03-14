#!/usr/bin/env python3
"""Update changelog.json and version.json.

Usage examples:
  python update_release.py --message "Fix build" --version 1.0.3
  python update_release.py "Fix build" 1.0.3

This script:
- Prepends a new entry to changelog.json with the current date (YYYY-MM-DD) and your message.
- Updates version.json to contain the provided version.

If you only want to update one of the files, omit the other argument.
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
import sys


def load_json(path: Path):
    if not path.exists():
        return None
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


def write_json(path: Path, data):
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def update_changelog(path: Path, message: str, today: str):
    if not message:
        raise ValueError('A changelog message is required.')

    changelog = load_json(path)
    if changelog is None:
        changelog = []
        print(f'Creating new {path}', file=sys.stderr)

    if not isinstance(changelog, list):
        raise ValueError(f'{path} must contain a JSON array at the top level.')

    entry = {
        'date': today,
        'message': message,
    }

    changelog.insert(0, entry)
    write_json(path, changelog)
    print(f'Updated {path} (added {today}: "{message}")')


def update_version(path: Path, version: str):
    if not version:
        raise ValueError('A version string is required.')

    version_data = {'version': version.strip()}
    write_json(path, version_data)
    print(f'Updated {path} to version {version_data["version"]}')


def main(argv=None):
    parser = argparse.ArgumentParser(description='Update changelog.json and version.json')
    parser.add_argument('message', nargs='?', help='Change note to add to changelog')
    parser.add_argument('version', nargs='?', help='Version string to write to version.json')
    parser.add_argument('--changelog', default='changelog.json', help='Path to changelog.json')
    parser.add_argument('--version-file', default='version.json', help='Path to version.json')

    args = parser.parse_args(argv)

    # Interactive prompt when arguments are not provided.
    if not args.message:
        args.message = input('Changelog message (leave blank to skip): ').strip()
    if not args.version:
        args.version = input('Version (leave blank to skip): ').strip()

    today = date.today().isoformat()

    if args.message:
        update_changelog(Path(args.changelog), args.message, today)

    if args.version:
        update_version(Path(args.version_file), args.version)

    if not args.message and not args.version:
        print('Nothing to do. Provide a message or a version.', file=sys.stderr)
        return 1

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
