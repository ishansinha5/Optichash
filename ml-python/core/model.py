import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

class GreenComicVision(nn.Module):
    def __init__(self, num_classes=5):
        super(GreenComicVision, self).__init__()
        
        # Load the highly optimized, lightweight MobileNetV3 Small backbone
        # We use pre-trained weights so it already knows how to detect shapes/edges
        self.backbone = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
        
        # MobileNetV3 was trained to predict 1000 classes. We only need 5.
        # We hijack the final layer and replace it with our own classification head.
        in_features = self.backbone.classifier[3].in_features
        self.backbone.classifier[3] = nn.Linear(in_features, num_classes)
        
    def forward(self, x):
        return self.backbone(x)

# Quick verification test to ensure the matrix math aligns
if __name__ == "__main__":
    model = GreenComicVision(num_classes=5)
    dummy_image = torch.randn(1, 3, 224, 224) # 1 image, 3 RGB channels, 224x224 pixels
    output = model(dummy_image)
    print(f"Neural Network Output Shape: {output.shape}") 
    # Expected output: torch.Size([1, 5]) -> 1 prediction containing 5 probabilities