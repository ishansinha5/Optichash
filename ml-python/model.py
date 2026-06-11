import torch
import torch.nn as nn
import torch.nn.functional as F

class ComicVisionNet(nn.Module):
    def __init__(self, num_classes=100):
        super(ComicVisionNet, self).__init__()
        # Layer 1: Catch broad strokes (titles, main figures)
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        
        # Layer 2: Catch tighter details
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        
        # Layer 3: Feature consolidation
        self.conv3 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        
        # Fully connected layer for final classification
        # Assuming input images are resized to 128x128
        self.fc1 = nn.Linear(64 * 16 * 16, 512)
        self.fc2 = nn.Linear(512, num_classes)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = self.pool(F.relu(self.conv3(x)))
        
        # Flatten the tensor for the dense layer
        x = torch.flatten(x, 1)
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x