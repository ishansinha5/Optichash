import torch
from torch.utils.data import DataLoader
from torchvision.transforms import v2
from torchvision.datasets import ImageFolder

def get_data_transformers():
    # Training transforms inject extreme chaos to fight sensor/background bias
    train_transform = v2.Compose([
        v2.Resize((224, 224)), # Crush massive phone photos to Green AI standard size
        v2.RandomRotation(degrees=15),
        v2.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        v2.RandomPerspective(distortion_scale=0.15, p=0.5),
        v2.ToImage(),
        v2.ToDtype(torch.float32, scale=True),
        v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Validation transforms ONLY resize and normalize (The clean final exam)
    val_transform = v2.Compose([
        v2.Resize((224, 224)),
        v2.ToImage(),
        v2.ToDtype(torch.float32, scale=True),
        v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, val_transform

def get_loaders(data_dir="data", batch_size=8):
    train_transform, val_transform = get_data_transformers()
    
    # ImageFolder automatically maps subfolder names directly to class integer labels
    train_dataset = ImageFolder(root=f"{data_dir}/train", transform=train_transform)
    val_dataset = ImageFolder(root=f"{data_dir}/val", transform=val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=2)
    
    return train_loader, val_loader, train_dataset.classes