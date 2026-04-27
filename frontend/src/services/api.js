import axios from "axios";

const API_BASE = "http://localhost:5000/api";

const api = axios.create({
    baseURL: API_BASE,
    timeout: 120000,
});

// Attach token to every request automatically
api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem("medvid_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. AUTHENTICATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const signupUser = (payload) => api.post("/auth/signup", payload);
export const loginUser  = (payload) => api.post("/auth/login", payload);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2. UPLOAD & ANALYSIS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const uploadVideo = async (file, patientData, onUploadProgress) => {
    const form = new FormData();
    form.append("video", file);
    if (patientData?.name) form.append("patientName", patientData.name);
    if (patientData?.id)   form.append("patientId",   patientData.id);
    return api.post("/video/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress
    });
};

export const analyzeVideo = (videoId) =>
    api.post(`/video/analyze/${videoId}`);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 3. HISTORY
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getHistory = async (params) => {
    const response = await api.get("/video/history", { params });
    // Backend returns: { data: { items: [], total: 0 } }
    return {
        data: {
            items: response.data.data.items || [],
            total: response.data.data.total || 0,
        }
    };
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4. RESULTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getResults = async (videoId) => {
    try {
        const response = await api.get(`/results/${videoId}`);
        const d = response.data;
        return {
            data: {
                videoId:         d.videoId,
                patientName:     d.patientName    || 'N/A',
                patientAge:      d.patientAge     || 'N/A',
                patientGender:   d.patientGender  || 'N/A',
                filename:        d.filename       || 'N/A',
                analysisStatus:  d.status?.toUpperCase() || 'COMPLETED',
                reportSummary:   d.reportSummary  || 'No summary available.',
                detections:      d.detections     || [],
                processedAt:     d.processedAt,
                uploadedAt:      d.uploadedAt     || null,
                topSeverity:     d.topSeverity    || 'None',
                totalDetections: d.totalDetections || 0,
                clipUrl:         d.clipUrl        || null,

                metadata: {
                    runtime_seconds: d.runtimeSeconds || 0
                }
            }
        };
    } catch (err) {
        console.error("getResults failed:", err.message);
        throw new Error(err?.response?.data?.message || "Failed to load results.");
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5. PATIENTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getPatients = async () => {
    try {
        const response = await api.get("/analysis/patients");
        // Backend returns: { patients: [...] }
        return response.data.patients || [];
    } catch (error) {
        console.error("Patients API failed:", error.message);
        return [];
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6. DELETE / RE-RUN / EXPORT (wired to real API)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getVideoThumbnail = async (file) => {
    const form = new FormData();
    form.append('video', file);
    return api.post('/video/thumbnail', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
    });
};

export const deleteAnalysis = (videoId) =>
    api.delete(`/video/${videoId}`);

export const downloadVideo = async (videoId, filename) => {
    const response = await api.get(`/video/${videoId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename || `video-${videoId}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

export const reRunAnalysis = (videoId) =>
    api.post(`/video/analyze/${videoId}`);

export const exportReport = async (videoId) => {
    const response = await api.get(`/reports/${videoId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `MedVid-Report-${videoId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 7. CONSULTANT CHAT (real API)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getConsultantList = async () => {
    try {
        const response = await api.get('/chat/consultants');
        return { data: response.data.consultants || [] };
    } catch (err) {
        console.error('getConsultantList failed:', err.message);
        return { data: [] };
    }
};

export const getChatMessages = async (consultantId) => {
    try {
        const response = await api.get(`/chat/${consultantId}/messages`);
        return { data: { messages: response.data.messages || [] } };
    } catch (err) {
        console.error('getChatMessages failed:', err.message);
        return { data: { messages: [] } };
    }
};

export const sendChatMessage = async (consultantId, text, videoId = null) => {
    try {
        const response = await api.post(`/chat/${consultantId}/send`, {
            message: text,
            videoId
        });
        return response;
    } catch (err) {
        console.error('sendChatMessage failed:', err.message);
        throw err;
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8. USER PROFILE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getUserProfile    = ()     => api.get('/user/profile');
export const updateUserProfile = (data) => api.put('/user/profile', data);
export const changePassword    = (data) => api.put('/user/password', data);

export default api;
