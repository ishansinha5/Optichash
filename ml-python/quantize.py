import torch
import os
from core.model import GreenComicVision

def execute_green_ai_crunch(fp32_path="comic_vision_fp32.pth", int8_path="comic_vision_int8.pth"):
    print("Initiating Green AI Compression Sequence...")
    
    # 1. Hardware Check: Quantization MUST happen on the CPU. 
    # INT8 math is optimized for standard edge-device processors.
    device = torch.device("cpu")
    
    # 2. Load the heavy, fully trained model
    if not os.path.exists(fp32_path):
        print(f"Error: {fp32_path} not found. You must run train.py first!")
        return

    model = GreenComicVision(num_classes=5)
    model.load_state_dict(torch.load(fp32_path, map_location=device))
    model.eval() # Lock the weights
    
    print("Heavy FP32 Model loaded. Applying INT8 Dynamic Quantization...")

    # 3. The Crunch (Dynamic Quantization)
    # We target the most computationally expensive layers (Linear/Dense).
    # This converts their 32-bit float math into highly efficient 8-bit integers.
    quantized_model = torch.quantization.quantize_dynamic(
        model, 
        {torch.nn.Linear}, 
        dtype=torch.qint8
    )
    
    # 4. Save the optimized micro-model
    torch.save(quantized_model.state_dict(), int8_path)
    print("Quantization complete. INT8 Model saved.")

    # 5. Calculate and print the hard metrics for the pitch
    fp32_size = os.path.getsize(fp32_path) / (1024 * 1024)
    int8_size = os.path.getsize(int8_path) / (1024 * 1024)
    reduction = ((fp32_size - int8_size) / fp32_size) * 100
    
    print("\n" + "="*40)
    print(" GREEN AI METRICS (PITCH DATA)")
    print("="*40)
    print(f" Original FP32 Footprint:  {fp32_size:.2f} MB")
    print(f" Optimized INT8 Footprint: {int8_size:.2f} MB")
    print(f" Total Compute Reduction:  {reduction:.1f}%")
    print("="*40 + "\n")

if __name__ == "__main__":
    execute_green_ai_crunch()