import io
import torch
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision.transforms import v2
from core.model import GreenComicVision
import uvicorn
from torchao.quantization import quantize_, Int8DynamicActivationInt8WeightConfig

app = FastAPI()

# SECURITY NOTE: In production, change "*" to your actual domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Inference Engine
device = torch.device("cpu")
print(f"Inference Engine booting on: {device}")

model = GreenComicVision(num_classes=6)
quantize_(model, Int8DynamicActivationInt8WeightConfig())

weights_path = "weights/comic_vision_int8.pth"
try:
    model.load_state_dict(torch.load(weights_path, map_location=device))
    print(f"SUCCESS: Loaded optimized Green AI weights from {weights_path}")
except Exception as e:
    print(f"ERROR loading weights: {e}")

model.to(device)
model.eval()

preprocess = v2.Compose([
    v2.Resize((224, 224)),
    v2.ToImage(),
    v2.ToDtype(torch.float32, scale=True),
    v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

METADATA_DB = {
    0: {"title": "Absolute Batman Annual #1", "url": "https://leagueofcomicgeeks.com/comic/6092062/absolute-batman-2025-annual-1"},
    1: {"title": "Absolute Martian Manhunter #8", "url": "https://leagueofcomicgeeks.com/comic/1616741/absolute-martian-manhunter-8"},
    2: {"title": "Beta Ray Bill: Argent Star (TPB)", "url": "https://leagueofcomicgeeks.com/comic/8509698/beta-ray-bill-argent-star-tp?variant=8271107"},
    3: {"title": "Junk", "url": None},
    4: {"title": "Nightwing: A Knight in Blüdhaven (Compendium Three)", "url": "https://leagueofcomicgeeks.com/comic/3717786/nightwing-a-knight-in-bluedhaven-compendium-book-3-tp"},
    5: {"title": "Transformers #4 (Variant Cover)", "url": "https://leagueofcomicgeeks.com/comic/4294159/transformers-4?variant=9647505"}
}

@app.post("/process")  
async def process_comic(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        input_tensor = preprocess(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            outputs = model(input_tensor)
            
            # Apply Logit Temperature Scaling
            TEMPERATURE = 2.0
            scaled_logits = outputs[0] / TEMPERATURE
            probabilities = torch.nn.functional.softmax(scaled_logits, dim=0)
            
            confidence, predicted = torch.max(probabilities, 0)
            confidence_score = confidence.item()
            predicted_id = predicted.item()

        THRESHOLD = 0.75
        
        if (confidence_score < THRESHOLD):
            return {
                "status": "error",
                "message": f"Low confidence match ({confidence_score * 100:.1f}%). Please ensure the cover is clearly visible."
            }
        
        # Check for Junk/Noise class (ID 3)
        if (predicted_id == 3):
            return {
                "status": "error",
                "message": "generic background noise"
            }

        comic_data = METADATA_DB.get(predicted_id, {"title": f"Class ID {predicted_id}", "url": None})

        return {
            "status": "success",
            "optimization_route": "inference_python",
            "predicted_id": predicted_id,
            "title": comic_data["title"],
            "url": comic_data["url"],
            "confidence": f"{confidence_score * 100:.1f}%",
            "generated_hash": "...",
            "compute_cycles_saved": 0
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

if (__name__ == "__main__"):
    uvicorn.run(app, host="0.0.0.0", port=7860)