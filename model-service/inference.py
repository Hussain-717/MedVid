import torch
import torch.nn as nn
import cv2
import numpy as np
from torchvision import transforms, models
import os

# ── MODEL CLASSES ───────────────────────────────────
class ResNetBackbone(nn.Module):
    def __init__(self, pretrained=False):
        super().__init__()
        resnet = models.resnet50(weights=None)
        self.feature_extractor = nn.Sequential(*list(resnet.children())[:-1])

    def forward(self, x):
        B, T, C, H, W = x.shape
        x = x.view(B * T, C, H, W)
        x = self.feature_extractor(x)
        x = x.view(B, T, -1)
        return x

class TemporalTransformer(nn.Module):
    def __init__(self, input_dim=2048, d_model=512, nhead=8,
                 num_layers=4, dim_feedforward=1024, dropout=0.1):
        super().__init__()
        self.input_projection    = nn.Linear(input_dim, d_model)
        self.positional_encoding = nn.Parameter(torch.randn(1, 256, d_model) * 0.02)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead, dim_feedforward=dim_feedforward,
            dropout=dropout, batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.norm = nn.LayerNorm(d_model)

    def forward(self, x):
        B, T, _ = x.shape
        x = self.input_projection(x)
        x = x + self.positional_encoding[:, :T, :]
        x = self.transformer(x)
        x = self.norm(x)
        return x

class ClassificationHead(nn.Module):
    def __init__(self, d_model=512, dropout=0.3):
        super().__init__()
        self.classifier = nn.Sequential(
            nn.Linear(d_model, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 1),
        )

    def forward(self, x):
        x = x.mean(dim=1)
        return self.classifier(x)

class DetectionHead(nn.Module):
    def __init__(self, d_model=512, dropout=0.3):
        super().__init__()
        self.regressor = nn.Sequential(
            nn.Linear(d_model, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 4),
            nn.Sigmoid(),
        )

    def forward(self, x):
        x = x.mean(dim=1)
        return self.regressor(x)

class MedVidModel(nn.Module):
    def __init__(self, pretrained=False, d_model=512, nhead=8,
                 num_layers=4, dim_feedforward=1024, dropout=0.1):
        super().__init__()
        self.backbone    = ResNetBackbone(pretrained=pretrained)
        self.transformer = TemporalTransformer(
            input_dim=2048, d_model=d_model, nhead=nhead,
            num_layers=num_layers, dim_feedforward=dim_feedforward, dropout=dropout,
        )
        self.cls_head = ClassificationHead(d_model=d_model, dropout=0.3)
        self.det_head = DetectionHead(d_model=d_model, dropout=0.3)

    def forward(self, frames):
        features   = self.backbone(frames)
        temporal   = self.transformer(features)
        cls_logits = self.cls_head(temporal)
        bbox_pred  = self.det_head(temporal)
        return {"cls_logits": cls_logits, "bbox_pred": bbox_pred}

# ── CONFIG ──────────────────────────────────────────
NUM_FRAMES   = 16
FRAME_HEIGHT = 224
FRAME_WIDTH  = 224
DEVICE       = 'cuda' if torch.cuda.is_available() else 'cpu'

# ── LOAD MODEL ──────────────────────────────────────
def load_model(model_path):
    model = MedVidModel(pretrained=False)
    checkpoint = torch.load(
        model_path,
        map_location=DEVICE,
        weights_only=False
    )
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(DEVICE)
    model.eval()
    print(f"Model loaded! Epoch: {checkpoint['epoch']}, Val Loss: {checkpoint['val_loss']:.4f}")
    return model

# ── PREPROCESSING ───────────────────────────────────
def extract_frames(video_path, num_frames=NUM_FRAMES):
    cap     = cv2.VideoCapture(video_path)
    total   = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps     = cap.get(cv2.CAP_PROP_FPS) or 25
    indices = np.linspace(0, total - 1, num_frames, dtype=int)

    frames     = []
    timestamps = []   # ✅ track real timestamp for each frame

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
            frames.append(frame)
            timestamps.append(idx / fps)   # ✅ seconds into video

    cap.release()
    return frames, timestamps   # ✅ return both

def preprocess(frames):
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    tensors = [transform(f) for f in frames]
    clip    = torch.stack(tensors)   # (T, 3, H, W)
    clip    = clip.unsqueeze(0)      # (1, T, 3, H, W)
    return clip.to(DEVICE)

# ── INFERENCE ───────────────────────────────────────
def run_inference(model, video_path):
    frames, timestamps = extract_frames(video_path)   # ✅ unpack both

    if len(frames) == 0:
        raise ValueError("Could not extract frames from video")

    tensor = preprocess(frames)

    with torch.no_grad():
        output = model(tensor)

    # ── Classification ─────────────────────────────
    cls_logits  = output['cls_logits']          # (1, 1)
    probability = torch.sigmoid(cls_logits).item()
    is_abnormal = probability >= 0.5
    label       = 'Polyp/Lesion Detected' if is_abnormal else 'Normal'

    # ── Bounding box (normalized 0-1) ──────────────
    bbox_norm = output['bbox_pred'][0].tolist()  # [x, y, w, h] all 0-1

    # ── Timestamp — middle frame of video ──────────
    # Since model processes 16 uniform frames across whole video,
    # we use the middle frame as the detection timestamp
    if is_abnormal and len(timestamps) > 0:
        # Use middle frame timestamp as detection point
        mid_idx   = len(timestamps) // 2
        timestamp = round(timestamps[mid_idx], 2)
    else:
        timestamp = 0.0

    print(f"Prediction: {label} | Confidence: {probability*100:.2f}%")
    print(f"Timestamp:  {timestamp}s")
    print(f"BBox (norm): {bbox_norm}")

    return {
        'label':       label,
        'confidence':  round(probability * 100, 2),
        'bbox':        bbox_norm,   # normalized — app.py will convert to pixels
        'is_abnormal': is_abnormal,
        'timestamp':   timestamp,   # ✅ real timestamp in seconds
    }