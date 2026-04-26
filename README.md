# MedVid — AI-Powered Medical Video Diagnostic Platform

MedVid is a full-stack web application that allows medical professionals to upload surgical/diagnostic videos, run AI-powered anomaly detection, view detailed analysis reports, and consult specialists in real time.

---

## Project Structure

```
MedVid/
├── frontend/          # React + Vite SPA (Material UI)
├── backend/           # Node.js + Express REST API + Socket.IO
├── model-service/     # Python Flask AI inference service (PyTorch)
└── .gitignore
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | v18+ |
| npm | v9+ |
| Python | 3.9+ |
| MongoDB Atlas | Free tier or higher |

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd MedVid
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file (use `.env.example` as a template):

```bash
cp .env.example .env
```

Fill in your values:

```
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
JWT_SECRET=your_strong_random_secret_here
```

Start the backend:

```bash
node server.js
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. AI Model Service

```bash
cd model-service
pip install -r requirements.txt
```

> **Important:** The model weights file (`best_model.pth`) is not included in this repository because it exceeds GitHub's 100 MB file limit (383 MB). Obtain it separately and place it in the `model-service/` directory before starting the service.

Start the model service:

```bash
python app.py
```

The Flask service runs on `http://localhost:8000` by default.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Port for the Express server (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key used to sign JWT tokens — use a long random string |

---

## Features

- **Video Upload** — upload patient surgical/diagnostic videos with metadata
- **AI Analysis** — PyTorch model detects anomalies, classifies severity (High / Medium / Low)
- **Analysis History** — paginated table with search, filter, sort, export, and delete
- **Detailed Reports** — per-detection breakdown with confidence scores, downloadable PDF
- **Consultant Chat** — real-time Socket.IO messaging between doctors and specialists
- **Admin Panel** — user approval queue, audit log, role management
- **Profile & Settings** — editable personal details, change password, theme toggle

---

## Default Ports

| Service | Port |
|---------|------|
| Frontend (Vite dev) | 5173 |
| Backend (Express) | 5000 |
| Model Service (Flask) | 8000 |

---

## Notes

- `.env` files are excluded from version control. Never commit real credentials.
- `backend/uploads/` contains patient video data and is excluded from version control.
- Model weights (`*.pth`, `*.pt`) are excluded. Host them on Google Drive, Hugging Face, or Git LFS and share the link separately.
- The app defaults to **dark mode**. Light mode is available via the theme toggle in the sidebar.