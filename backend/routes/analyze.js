const express  = require('express');
const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const path     = require('path');

const router  = express.Router();
const upload  = multer({ dest: path.join(__dirname, '../uploads/') });

router.post('/', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video uploaded' });
    }

    try {
        // Forward to Python service
        const form = new FormData();
        form.append('video', fs.createReadStream(req.file.path), {
            filename: req.file.originalname
        });

        const response = await axios.post(
            'http://localhost:5001/analyze',
            form,
            {
                headers: form.getHeaders(),
                timeout: 300000   // 5 min for long videos
            }
        );

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        return res.json({
            success:    true,
            filename:   req.file.originalname,
            result:     response.data
        });

    } catch (err) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;