#!/usr/bin/env python3
"""Create a new HTML file from template.html.

This script will:
- Read `template.html` from the repository root.
- Prompt for a new file name (e.g. "mygame.html").
- Create that file as a copy of template.html, replacing every occurrence of the string "NAME" with the file name provided.

Usage:
  python generate_from_template.py

"""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    template_path = Path('games') / 'template.html'
    if not template_path.exists():
        print(f'Error: {template_path} not found.', file=sys.stderr)
        return 1

    target_name = input('New filename (e.g. mygame.html): ').strip()
    if not target_name:
        print('No filename provided, exiting.', file=sys.stderr)
        return 1

    # Always create inside the `games/` folder.
    target_base = Path(target_name).name

    # Ensure the new file has an .html extension.
    if not Path(target_base).suffix:
        target_base = f'{target_base}.html'

    target_path = Path('games') / target_base
    if target_path.exists():
        overwrite = input(f'{target_path} already exists. Overwrite? [y/N]: ').strip().lower()
        if overwrite not in ('y', 'yes'):
            print('Aborted.', file=sys.stderr)
            return 1

    template_text = template_path.read_text(encoding='utf-8')
    output_text = template_text.replace('NAME', target_name)

    target_path.write_text(output_text, encoding='utf-8')
    print(f'Created {target_path} (replaced NAME with "{target_name}").')

    return 0


if __name__ == '__main__':
    import sys
    raise SystemExit(main())
