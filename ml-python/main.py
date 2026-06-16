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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

        CLASS_MAP = {
            0: "absolute_batman_annual_1",
            1: "absolute_martian_manhunter",
            2: "beta_ray_bill_tpb",
            3: "junk",
            4: "nightwing_compendium_3",
            5: "transformers_4"
        }
        
        comic_key = CLASS_MAP[predicted_id]
        
        if (comic_key == "junk"):
            return {
                "status": "error",
                "message": "Image recognized as generic background noise."
            }

        final_title = f"Class ID {predicted_id}"
        final_url = None

        METADATA_DB = {
            "absolute_batman_annual_1": {
                "title": "Absolute Batman #1", 
                "url": "https://leagueofcomicgeeks.com/comic/6092062/absolute-batman-2025-annual-1"
            },
            "absolute_martian_manhunter": {
                "title": "Absolute Martian Manhunter #1", 
                "url": "https://leagueofcomicgeeks.com/comic/1616741/absolute-martian-manhunter-8"
            },
            "beta_ray_bill_tpb": {
                "title": "Beta Ray Bill: Argent Star", 
                "url": "https://leagueofcomicgeeks.com/comic/8509698/beta-ray-bill-argent-star-tp?variant=8271107"
            },
            "nightwing_compendium_3": {
                "title": "Nightwing Compendium Three", 
                "url": "https://leagueofcomicgeeks.com/comic/3717786/nightwing-a-knight-in-bluedhaven-compendium-book-3-tp"
            },
            "transformers_4": {
                "title": "Transformers #4", 
                "url": "https://leagueofcomicgeeks.com/comic/4294159/transformers-4?variant=9647505"
            }
        }

        if (comic_key in METADATA_DB):
            final_title = METADATA_DB[comic_key]["title"]
            final_url = METADATA_DB[comic_key]["url"]

        return {
            "status": "success",
            "optimization_route": "inference_python",
            "predicted_id": predicted_id,
            "title": final_title,
            "url": final_url,
            "confidence": f"{confidence_score * 100:.1f}%",
            "compute_cycles_saved": 0
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

if (__name__ == "__main__"):
    uvicorn.run(app, host="0.0.0.0", port=7860)