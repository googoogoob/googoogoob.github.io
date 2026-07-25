import os

CHUNK_SIZE = 20 * 1024 * 1024  # 20 MB

def split_file(file_path):
    if not os.path.isfile(file_path):
        print("File not found.")
        return

    file_size = os.path.getsize(file_path)
    total_parts = (file_size + CHUNK_SIZE - 1) // CHUNK_SIZE

    print(f"Splitting '{file_path}' into {total_parts} parts...")

    with open(file_path, "rb") as infile:
        part = 1
        while True:
            data = infile.read(CHUNK_SIZE)
            if not data:
                break

            part_name = f"{file_path}.part{part}"
            with open(part_name, "wb") as outfile:
                outfile.write(data)

            print(f"Created: {part_name}")
            part += 1

    print("Done!")

if __name__ == "__main__":
    target = input("File to split: ").strip().strip('"')
    split_file(target)