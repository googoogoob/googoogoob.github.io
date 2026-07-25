#!/usr/bin/env python3
"""Add a new game to the website with a redirector and drag-n-drop support.

This script:
1. Creates a redirector HTML file for easy access
2. Copies game assets from an existing directory
3. Adds the game to the top of the websites game list
4. Adds the game to the game library overlay
"""

from __future__ import annotations

import shutil
from pathlib import Path
import argparse
import sys


def create_redirector(game_name: str) -> str:
    """Create a simple redirector HTML file."""
    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{game_name}</title>
    <meta http-equiv="refresh" content="0; url={game_name}/index.html">
    <script>
        window.location.replace('{game_name}/index.html');
    </script>
  </head>
  <body>
    <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Arial, sans-serif;">
      <div style="text-align: center;">
        <h1>{game_name}</h1>
        <p>If you are not redirected automatically, please <a href="{game_name}/index.html">click here</a>.</p>
        <p>Game is loading...</p>
      </div>
    </div>
  </body>
</html>"""
    
    return html


def copy_game_assets(source_dir: Path, target_dir: Path) -> list[str]:
    """Copy game assets from source to target directory."""
    copied_files = []
    
    for item in source_dir.rglob("*"):
        rel_path = item.relative_to(source_dir)
        target_path = target_dir / rel_path
        
        if item.is_file():
            # Create parent directories if they don't exist
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy the file
            shutil.copy2(item, target_path)
            copied_files.append(str(rel_path))
    
    return copied_files


def update_games_index(game_name: str) -> bool:
    """Add a new game to the top of the games navigation."""
    index_path = Path("games") / "index.html"
    
    if not index_path.exists():
        print(f"Error: {index_path} not found.", file=sys.stderr)
        return False
    
    content = index_path.read_text(encoding="utf-8")
    
    # Find the position to insert the new game in the navigation
    # Look for the closing </div> of the previous game, or the end of the row
    nav_pos = content.find("  </div>\\n  <a href=\\\"")
    
    if nav_pos == -1:
        # Alternative pattern check
        nav_pos = content.find("  <a href=\\\"")
        if nav_pos == -1:
            print(f"Error: Could not find game link pattern in {index_path}.", file=sys.stderr)
            return False
        # Insert after the opening tag
        nav_pos += len('  <a href="')
    else:
        nav_pos += len("  </div>\\n  <a href=")
    
    # Create the new game entry (similar to existing games)
    new_game_entry = f'''  <a href="{game_name}/" target="_blank">{game_name}</a>
'''
    
    # Insert the new game at the top (replace the first href line)
    if nav_pos > 0 and nav_pos < len(content):
        # Find the start of the line with the first href
        line_start = content.rfind('\\n', 0, nav_pos) + 1
        line_end = content.find('\\n', nav_pos)
        if line_end == -1:
            line_end = len(content)
        
        # Replace the first href line with our new game entry
        new_content = content[:line_start] + new_game_entry + content[line_end:]
        index_path.write_text(new_content, encoding="utf-8")
    else:
        # Fallback: just add at the beginning after the opening div
        first_div_end = content.find("    </div> \\n    <a href=\\\"")
        if first_div_end != -1:
            first_div_end += len("    </div> \\n    <a href=")
            line_start = content.rfind('\\n', 0, first_div_end) + 1
            line_end = content.find('\\n', first_div_end)
            if line_end == -1:
                line_end = len(content)
            
            new_content = content[:line_start] + new_game_entry + content[line_end:]
            index_path.write_text(new_content, encoding="utf-8")
        else:
            print(f"Warning: Could not find proper position to add game to navigation.", file=sys.stderr)
            return False
    
    print(f"PASS Added '{game_name}' to the games index navigation (top of list)")
    return True


def update_game_library(game_name: str) -> bool:
    """Add a new game to the game library overlay."""
    index_path = Path("games") / "index.html"
    
    if not index_path.exists():
        print(f"Error: {index_path} not found.", file=sys.stderr)
        return False
    
    content = index_path.read_text(encoding="utf-8")
    
    # Find the game library grid section
    # Look for: '<div class="library-grid">' followed by game cards
    grid_start = content.find('<div class="library-grid">')
    if grid_start == -1:
        print(f"Error: Could not find game library grid in {index_path}.", file=sys.stderr)
        return False
    
    # Find the end of the library-grid div
    grid_end = content.find('</div>', grid_start + len('<div class="library-grid">'))
    if grid_end == -1:
        print(f"Error: Could not find end of library-grid in {index_path}.", file=sys.stderr)
        return False
    
    # Extract the grid content and count existing cards
    grid_content = content[grid_start:grid_end]
    
    # Create a nice display name from game_name (capitalize, handle common names)
    display_name = game_name.replace('-', ' ').replace('_', ' ')
    display_name = ' '.join(word.capitalize() for word in display_name.split())
    
    # Map common game names to their display names
    name_mapping = {
        'spt': 'Super Smash Bros',
        'stardew': 'Stardew Valley',
        'silksong': 'Hollow Knight Silksong',
        'hudk': 'Hollow Knight',
        'hl2': 'Half Life 2',
        'portal': 'Portal',
        'tabs': 'Totally Accurate Battle Simulator',
        'orl': 'Orland',
        'inscryption': 'Inscryption',
        'lobcorp': 'Lobotomy Corporation',
        'wordle': 'Wordle',
        'brote': 'Brotato',
        'balat': 'Balatro',
        'airshi1': 'Airships 1',
        'airshi2': 'Airships 2',
        'hl2h': 'Half Life 2: Headcrab Pack',
    }
    
    display_name = name_mapping.get(game_name.lower(), display_name)
    
    # Create the new game card
    new_game_card = f'''
                <div class="game-card" data-title="{game_name}">
                    <div class="game-title">{display_name}</div>
                </div>'''
    
    # Insert the new card after the opening library-grid div
    # Find the position after the opening tag and before the closing tag
    insert_pos = grid_start + len('<div class="library-grid">')
    new_grid_content = grid_content[:insert_pos] + new_game_card + grid_content[insert_pos:]
    
    # Replace the grid content in the main content
    new_content = content[:grid_start] + new_grid_content + content[grid_end:]
    
    # Write back
    index_path.write_text(new_content, encoding="utf-8")
    
    print(f"PASS Added '{game_name}' to the game library overlay")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Add a new game to the website with automatic redirector and drag-n-drop support."
    )
    parser.add_argument(
        "game_name",
        help="Name of the game (will create game_name/ and game_name.html redirect)"
    )
    parser.add_argument(
        "--from-dir",
        "--source",
        dest="source_dir",
        help="Source directory containing game files (drag-n-drop folder contents)"
    )
    
    args = parser.parse_args()
    
    game_name = args.game_name
    source_dir = Path(args.source_dir) if args.source_dir else None
    
    # Create games directory if it doesn't exist
    games_dir = Path("games")
    games_dir.mkdir(exist_ok=True)
    
    # Create the game directory
    game_dir = games_dir / game_name
    game_dir.mkdir(exist_ok=True)
    
    # Create the redirector HTML file
    redirector_path = games_dir / f"{game_name}.html"
    redirector_content = create_redirector(game_name)
    redirector_path.write_text(redirector_content, encoding="utf-8")
    
    print(f"PASS Created redirector: {redirector_path}")
    
    # Copy assets if source directory is provided
    if source_dir:
        if not source_dir.exists():
            print(f"Error: Source directory '{source_dir}' does not exist.", file=sys.stderr)
            sys.exit(1)
        
        if source_dir.is_file():
            # If a specific file is provided, copy it to the game directory root
            target_file = game_dir / source_dir.name
            shutil.copy2(source_dir, target_file)
            print(f"PASS Copied file: {source_dir.name}")
        else:
            # If a directory is provided, copy all contents
            copied = copy_game_assets(source_dir, game_dir)
            print(f"PASS Copied {len(copied)} files from {source_dir}")
            if len(copied) <= 10:
                for f in copied:
                    print(f"  - {f}")
            else:
                print(f"  - ... and {len(copied) - 10} more files")
    
    # Update the games index navigation
    nav_updated = update_games_index(game_name)
    
    # Update the game library
    library_updated = update_game_library(game_name)
    
    if nav_updated or library_updated:
        print(f"\nPASS Game '{game_name}' setup complete!")
        print(f"  - Redirector: {redirector_path}")
        print(f"  - Game directory: {game_dir}")
        if nav_updated:
            print(f"  - Added to: games/index.html (navigation)")
        if library_updated:
            print(f"  - Added to: games/index.html (game library)")
        print("\nDrag other game files into the game directory or remove unnecessary files.")
    else:
        print(f"WARN Warning: Could not fully update game references.")
        print(f"  - Redirector: {redirector_path}")
        print(f"  - Game directory: {game_dir}")


if __name__ == "__main__":
    main()
i m p o r t   s h u t i l 
 f r o m   p a t h l i b   i m p o r t   P a t h 
 i m p o r t   a r g p a r s e 
 i m p o r t   s y s 
  
 