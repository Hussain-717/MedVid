import { useState } from 'react';

export default function VideoUpload() {
    const [file,      setFile]      = useState(null);
    const [loading,   setLoading]   = useState(false);
    const [result,    setResult]    = useState(null);
    const [error,     setError]     = useState(null);

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('video', file);

        try {
            const res  = await fetch('http://localhost:5000/api/analyze', {
                method: 'POST',
                body:   formData
            });
            const data = await res.json();
            setResult(data.result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <input
                type="file"
                accept="video/*"
                onChange={e => setFile(e.target.files[0])}
            />
            <button onClick={handleSubmit} disabled={!file || loading}>
                {loading ? 'Analyzing...' : 'Analyze Video'}
            </button>

            {result && (
                <div>
                    <h3>Result: {result.label}</h3>
                    <p>Confidence: {result.confidence}%</p>
                </div>
            )}

            {error && <p style={{color: 'red'}}>{error}</p>}
        </div>
    );
}