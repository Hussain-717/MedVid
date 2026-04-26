const ADMIN_TOKEN = 'hardcoded-admin-token-123';

const adminProtect = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer')) {
        return res.status(401).json({ message: 'Admin token required.' });
    }
    const token = auth.split(' ')[1];
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ message: 'Invalid admin token.' });
    }
    req.user = { id: null, role: 'Admin' };
    next();
};

module.exports = { adminProtect };