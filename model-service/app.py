import os
import uuid
import cv2
from flask import Flask, request, jsonify, send_from_directory
from inference import load_model, run_inference
from video_processor import create_heatmap_clip

app = Flask(__name__)

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(__file__)
CLIPS_FOLDER = os.path.join(BASE_DIR, 'clips')
MODEL_PATH   = os.path.join(BASE_DIR, 'best_model1.pth')
os.makedirs(CLIPS_FOLDER, exist_ok=True)

# ── Load model once at startup ─────────────────────────────────────────
print("Loading MedVid AI model...")
model = load_model(MODEL_PATH)
print("Model ready!")

# ── Helper: convert normalized bbox to pixel coords ───────────────────
def bbox_norm_to_pixels(bbox_norm, width, height):
    """
    bbox_norm = [x, y, w, h] all in range 0-1
    Returns   = [x, y, w, h] in actual pixel values
    """
    x = int(bbox_norm[0] * width)
    y = int(bbox_norm[1] * height)
    w = int(bbox_norm[2] * width)
    h = int(bbox_norm[3] * height)
    return [x, y, w, h]

@app.route('/')
def index():
    return jsonify({'status': 'MedVid Flask API running', 'port': 5001})

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    video_file = request.files['video']

    # Save uploaded video temporarily
    temp_filename = f"temp_{uuid.uuid4().hex}.mp4"
    temp_path     = os.path.join(BASE_DIR, 'temp', temp_filename)
    os.makedirs(os.path.join(BASE_DIR, 'temp'), exist_ok=True)
    video_file.save(temp_path)

    try:
        print(f"\n--- Analyzing: {video_file.filename} ---")

        # ── Run real AI model ──────────────────────────────────────
        result = run_inference(model, temp_path)
        print(f"AI Result: {result}")

        clip_url = None

        # ── Generate heatmap clip if abnormal ─────────────────────
        if result.get('is_abnormal'):

            # Get video dimensions for bbox conversion
            cap    = cv2.VideoCapture(temp_path)
            width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()

            # Convert normalized bbox → pixel coords
            bbox_pixels = bbox_norm_to_pixels(
                result['bbox'], width, height
            )
            print(f"BBox pixels: {bbox_pixels} (video: {width}x{height})")

            # Generate clip
            clip_filename = f"clip_{uuid.uuid4().hex}.mp4"
            clip_path     = os.path.join(CLIPS_FOLDER, clip_filename)

            saved_path = create_heatmap_clip(
                video_path          = temp_path,
                output_path         = clip_path,
                detection_timestamp = result['timestamp'],
                bbox                = bbox_pixels,
                clip_duration       = 10
            )

            if saved_path:
                clip_url = os.path.basename(saved_path)
                print(f"Clip saved: {clip_url}")
            else:
                print("Clip generation failed")

        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify({
            "label":       result['label'],
            "confidence":  result['confidence'],
            "is_abnormal": result['is_abnormal'],
            "timestamp":   result['timestamp'],
            "bbox":        result['bbox'],
            "clip_url":    clip_url
        })

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"Analysis error: {e}")
        import traceback
        traceback.print_exc()   # ← shows full Python error in terminal
        return jsonify({'error': str(e)}), 500


# Serve generated clips
@app.route('/clips/<filename>')
def serve_clip(filename):
    return send_from_directory(CLIPS_FOLDER, filename)


if __name__ == '__main__':
    app.run(port=5001, debug=False)  # debug=False avoids double model load