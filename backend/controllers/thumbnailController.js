const { execFile } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const getVideoThumbnail = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No video file provided.' });

    const inputPath  = path.join(os.tmpdir(), `thumb_in_${Date.now()}${path.extname(req.file.originalname || '.tmp')}`);
    const outputPath = path.join(os.tmpdir(), `thumb_out_${Date.now()}.jpg`);

    try {
        fs.writeFileSync(inputPath, req.file.buffer);

        await new Promise((resolve, reject) => {
            execFile('ffmpeg', [
                '-y',
                '-ss', '00:00:01',
                '-i', inputPath,
                '-frames:v', '1',
                '-q:v', '2',
                outputPath
            ], { timeout: 30000 }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!fs.existsSync(outputPath))
            return res.status(500).json({ message: 'Thumbnail generation failed.' });

        const base64 = fs.readFileSync(outputPath).toString('base64');
        res.json({ thumbnail: `data:image/jpeg;base64,${base64}` });

    } catch {
        res.status(500).json({ message: 'Could not generate thumbnail.' });
    } finally {
        if (fs.existsSync(inputPath))  fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
};

module.exports = { getVideoThumbnail };