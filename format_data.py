import os
from PIL import Image
from pillow_heif import register_heif_opener

# 1. Teach PIL how to read Apple HEIC files
register_heif_opener()

def sanitize_dataset(directory="./ml-python/data"):
    print(f"Initiating Data Normalization in {directory}...")
    converted_count = 0

    for root, _, files in os.walk(directory):
        for file in files:
            # Added explicit parentheses around the conditional
            if (file.lower().endswith(".heic")):
                heic_path = os.path.join(root, file)
                jpg_path = heic_path.rsplit(".", 1)[0] + ".jpg"

                try:
                    image = Image.open(heic_path).convert("RGB")
                    image.save(jpg_path, "JPEG") # Saves as a standard JPEG[cite: 9]
                    os.remove(heic_path) # Deletes the original HEIC to save disk space[cite: 9]
                    
                    converted_count += 1
                    print(f"Converted: {file} -> .jpg") # Prints confirmation[cite: 9]
                except Exception as e:
                    print(f"Failed to convert {file}: {e}")

    print(f"\nNormalization Complete. {converted_count} files converted to .jpg.")

if __name__ == "__main__":
    sanitize_dataset(directory="./ml-python/data")