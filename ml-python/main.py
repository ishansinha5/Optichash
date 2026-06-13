import io
import torch
from fastapi import FastAPI, UploadFile, File
from PIL import Image
from torchvision.transforms import v2
from model import GreenComicVision
import uvicorn

app = FastAPI()

# 1. Hardware Awareness: Use GPU if available, fallback to CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Inference Engine booting on: {device}")

# 2. Initialize the Green AI Model
model = GreenComicVision(num_classes=5)

# Load the true weights trained from your friends' chaos pictures.
# Wrapped in a try/except so the container doesn't crash before you run train.py!
try:
    model.load_state_dict(torch.load("comic_vision_fp32.pth", map_location=device))
    print("SUCCESS: Loaded trained FP32 weights.")
except FileNotFoundError:
    print("WARNING: comic_vision_fp32.pth not found. Using untrained weights until train.py is executed.")

model.to(device)
model.eval()  # CRITICAL: Locks the network weights and turns off training behaviors

# 3. The Green AI Preprocessing Pipeline
preprocess = v2.Compose([
    v2.Resize((224, 224)),
    v2.ToImage(),
    v2.ToDtype(torch.float32, scale=True),
    v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

@app.post("/process")  
async def process_comic(file: UploadFile = File(...)):
    try:
        # 1. Catch the multipart bytes from Java and convert to a PIL Image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # 2. Apply preprocessing and add the Batch Dimension
        input_tensor = preprocess(image).unsqueeze(0).to(device)
        
        # 3. Execute Neural Network Inference
        with torch.no_grad():  # CRITICAL: Disables gradient tracking to save memory/CPU
            outputs = model(input_tensor)
            _, predicted = torch.max(outputs, 1)
            predicted_id = predicted.item()

        # 4. Return the exact JSON contract your architecture expects
        return {
            "status": "success",
            "optimization_route": "inference_python",
            "predicted_id": predicted_id,
            "compute_cycles_saved": 0 # We will update this after INT8 Quantization
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)