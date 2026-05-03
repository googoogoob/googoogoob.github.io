import os

THRESHOLD_MB = 25
THRESHOLD_BYTES = THRESHOLD_MB * 1024 * 1024

def find_large_files(directory="."):
    large_files = []

    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            size_bytes = os.path.getsize(filepath)
            if size_bytes > THRESHOLD_BYTES:
                size_mb = size_bytes / (1024 * 1024)
                large_files.append((filename, size_mb))

    return large_files

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Scanning: {script_dir}")
    print(f"Looking for files larger than {THRESHOLD_MB} MB...\n")

    results = find_large_files(script_dir)

    if results:
        results.sort(key=lambda x: x[1], reverse=True)
        print(f"Found {len(results)} file(s):\n")
        for name, size_mb in results:
            print(f"  {size_mb:>8.2f} MB  —  {name}")
    else:
        print("No files larger than 25 MB found.")