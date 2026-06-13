import os
from PIL import Image
from pillow_heif import register_heif_opener

# 1. Teach PIL how to read Apple HEIC files
register_heif_opener()

def sanitize_dataset(directory="./ml-python/dataset"):
    print(f"Initiating Data Normalization in {directory}...")
    converted_count = 0

    # 2. Spider through all subfolders (Train, Validation, Angles, etc.)
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(".heic"):
                heic_path = os.path.join(root, file)
                jpg_path = heic_path.rsplit(".", 1)[0] + ".jpg"

                try:
                    # Open the HEIC and convert the color matrix to standard RGB
                    image = Image.open(heic_path).convert("RGB")
                    
                    # Save as a standard JPEG
                    image.save(jpg_path, "JPEG")
                    
                    # Delete the original HEIC to save disk space
                    os.remove(heic_path)
                    
                    converted_count += 1
                    print(f"Converted: {file} -> .jpg")
                except Exception as e:
                    print(f"Failed to convert {file}: {e}")

    print(f"\nNormalization Complete. {converted_count} files converted to .jpg.")

if __name__ == "__main__":
    # Ensure you update this path to point to wherever you saved your friend's folders!
    sanitize_dataset(directory="./ml-python/dataset")