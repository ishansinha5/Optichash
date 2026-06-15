import torch
import torch.nn as nn
import torch.optim as optim
from core.dataset import get_loaders
from core.model import GreenComicVision

def train_model(data_dir, num_epochs=10):
    # 1. Hardware Awareness: Use GPU if available, fallback to CPU
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    # 2. Load the Data Pipes
    train_loader, val_loader, class_names = get_loaders(data_dir, batch_size=8)
    num_classes = len(class_names)
    print(f"Detected Classes: {class_names}")

    # 3. Initialize the Green AI Brain
    model = GreenComicVision(num_classes=num_classes).to(device)

    # 4. Define the Math (Loss & Optimizer)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)

    # 5. The Training Loop
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()           # Clear old memory
            outputs = model(images)         # Guess what the comic is
            loss = criterion(outputs, labels) # Calculate how wrong it was
            loss.backward()                 # Calculate the correction
            optimizer.step()                # Apply the correction
            
            running_loss += loss.item()
            
        print(f"Epoch [{epoch+1}/{num_epochs}] - Training Loss: {running_loss/len(train_loader):.4f}")

    # Save the heavy, unquantized FP32 model for the pruning phase later
    torch.save(model.state_dict(), "weights/comic_vision_fp32.pth")
    print("Base FP32 Model saved. Ready for Green AI Quantization.")

if __name__ == "__main__":
    train_model(data_dir="data", num_epochs=15)