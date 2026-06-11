from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import torch
import io
from PIL import Image
from torchvision import transforms
from model import ComicVisionNet
import datetime

app = FastAPI()

# Initialize our custom CNN (Stubbed with untrained weights for architecture mapping)
model = ComicVisionNet(num_classes=100)
model.eval() # Set to evaluation mode for inference

# The preprocessing pipeline: Resize, grayscale, and normalize
preprocess = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.Grayscale(num_output_channels=1),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5], std=[0.5])
])

@app.post("/predict-cover")
async def predict_cover(file: UploadFile = File(...)):
    # 1. Read the binary image from the C++ Bouncer
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))
    
    # 2. Preprocess the image for the CNN
    input_tensor = preprocess(image)
    input_batch = input_tensor.unsqueeze(0) # Create a mini-batch of 1
    
    # 3. Execute PyTorch Inference
    with torch.no_grad():
        output = model(input_batch)
    
    # Placeholder for mapping tensor output to actual comic DB ID
    predicted_class_id = torch.argmax(output[0]).item()
    
    return {
        "status": "success",
        "optimization_route": "inference_python",
        "predicted_id": predicted_class_id,
        "compute_cycles_saved": 0 # 0 saved because we had to run inference
    }

@app.get("/sync-release-calendar")
async def sync_calendar():
    dummy_releases = [
        {"title": "Absolute Batman #1", "release_date": str(datetime.date.today())}
    ]
    return {"status": "synced", "calendar_updates": dummy_releases}