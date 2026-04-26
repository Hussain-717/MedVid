import cv2
import numpy as np
import os
import subprocess

def create_heatmap_clip(
    video_path,
    output_path,
    detection_timestamp,
    bbox,
    clip_duration=10
):
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Cannot open video: {video_path}")
            return None

        fps          = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_secs   = total_frames / fps

        print(f"Video info: {width}x{height} @ {fps}fps, {total_secs:.1f}s")

        # ── Clip window ───────────────────────────────────────────
        start_sec   = max(0, detection_timestamp - clip_duration)
        end_sec     = min(total_secs, detection_timestamp + clip_duration)
        start_frame = int(start_sec * fps)
        end_frame   = int(end_sec   * fps)

        print(f"Clipping {start_sec:.1f}s → {end_sec:.1f}s "
              f"(detection at {detection_timestamp:.1f}s)")

        # ── Write to a temp AVI file first (most compatible) ──────
        temp_avi = output_path.replace('.mp4', '_temp.avi')
        fourcc   = cv2.VideoWriter_fourcc(*'XVID')
        out      = cv2.VideoWriter(temp_avi, fourcc, fps, (width, height))

        if not out.isOpened():
            print("VideoWriter failed — trying MJPG codec")
            fourcc = cv2.VideoWriter_fourcc(*'MJPG')
            temp_avi = output_path.replace('.mp4', '_temp.avi')
            out = cv2.VideoWriter(temp_avi, fourcc, fps, (width, height))

        # ── Parse bbox [x, y, w, h] ───────────────────────────────
        if bbox and len(bbox) == 4:
            bx, by, bw, bh = (int(v) for v in bbox)
        else:
            bx, by, bw, bh = 0, 0, 0, 0
        has_bbox = bw > 0 and bh > 0

        # ── Process frames ────────────────────────────────────────
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        frame_index = start_frame

        while frame_index <= end_frame:
            ret, frame = cap.read()
            if not ret:
                break

            current_sec    = frame_index / fps
            near_detection = abs(current_sec - detection_timestamp) <= 2.0

            # Red heatmap overlay near detection
            if near_detection and has_bbox:
                overlay = frame.copy()
                cv2.rectangle(overlay,
                              (bx, by), (bx + bw, by + bh),
                              (0, 0, 255), -1)
                cv2.addWeighted(overlay, 0.4, frame, 0.6, 0, frame)
                # Red border
                cv2.rectangle(frame,
                              (bx, by), (bx + bw, by + bh),
                              (0, 0, 255), 3)
                # Label background + text
                cv2.rectangle(frame,
                              (bx, max(0, by - 32)),
                              (bx + 185, by),
                              (0, 0, 180), -1)
                cv2.putText(frame, "POLYP DETECTED",
                            (bx + 4, max(12, by - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.65, (255, 255, 255), 2)

            # Timestamp watermark
            elapsed = current_sec - start_sec
            m, s    = int(elapsed // 60), int(elapsed % 60)
            cv2.putText(frame, f"Time: {m:02d}:{s:02d}",
                        (10, 35),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.9, (255, 255, 255), 2)

            # Detection zone banner
            if near_detection:
                cv2.putText(frame,
                            f"Detection at {int(detection_timestamp)}s",
                            (10, height - 15),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.7, (0, 255, 255), 2)

            out.write(frame)
            frame_index += 1

        cap.release()
        out.release()
        print(f"Raw clip written: {temp_avi}")

        # ── Convert to browser-compatible H.264 MP4 ───────────────
        final_path = output_path
        converted  = False

        # Try ffmpeg first (best quality + browser compat)
        try:
            cmd = [
                r'C:\Users\saliq\Downloads\ffmpeg\ffmpeg\bin\ffmpeg.exe', '-y',  # ✅ full path
                '-i', temp_avi,
                '-vcodec', 'libx264',
                '-acodec', 'aac',
                '-movflags', '+faststart',   # ← enables streaming
                '-pix_fmt', 'yuv420p',       # ← browser compatibility
                final_path
            ]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )
            if result.returncode == 0 and os.path.exists(final_path):
                converted = True
                print(f"ffmpeg conversion successful: {final_path}")
            else:
                print(f"ffmpeg error: {result.stderr[-300:]}")
        except FileNotFoundError:
            print("ffmpeg not found — using raw AVI fallback")
        except Exception as e:
            print(f"ffmpeg exception: {e}")

        # Fallback: just rename AVI if ffmpeg failed
        if not converted:
            import shutil
            shutil.copy(temp_avi, final_path)
            print(f"Fallback: copied AVI as MP4: {final_path}")

        # Cleanup temp AVI
        if os.path.exists(temp_avi):
            os.remove(temp_avi)

        print(f"✅ Final clip ready: {final_path}")
        return final_path

    except Exception as e:
        print(f"Video processing error: {e}")
        import traceback
        traceback.print_exc()
        return None
