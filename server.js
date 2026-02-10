import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// API Imports
import Analytics from './api/analytics.js';
import Ap from './api/ap.js';
import Config from './api/config.js';
import ReportAbuse from './api/report-abuse.js';
import Trap from './api/trap.js';
import ValidateAccess from './api/validate-access.js';
import ValidateEmail from './api/validate-email.js';
import VerifyEmail from './api/verify-email.js';
import VerifyHcaptcha from './api/verify-hcaptcha.js';
import VerifyRecaptchaV2 from './api/verify-recaptcha-v2.js';
import VerifyRecaptcha from './api/verify-recaptcha.js';
import Verify from './api/verify.js';
import VisitorInfo from './api/visitor-info.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the build directory
app.use(express.static(join(__dirname, 'dist')));

// API Routes
app.all('/api/analytics', (req, res) => Analytics(req, res));
app.all('/api/ap', (req, res) => Ap(req, res));
app.all('/api/config', (req, res) => Config(req, res));
app.all('/api/report-abuse', (req, res) => ReportAbuse(req, res));
app.all('/api/trap', (req, res) => Trap(req, res));
app.all('/api/validate-access', (req, res) => ValidateAccess(req, res));
app.all('/api/validate-email', (req, res) => ValidateEmail(req, res));
app.all('/api/verify-email', (req, res) => VerifyEmail(req, res));
app.all('/api/verify-hcaptcha', (req, res) => VerifyHcaptcha(req, res));
app.all('/api/verify-recaptcha-v2', (req, res) => VerifyRecaptchaV2(req, res));
app.all('/api/verify-recaptcha', (req, res) => VerifyRecaptcha(req, res));
app.all('/api/verify', (req, res) => Verify(req, res));
app.all('/api/visitor-info', (req, res) => VisitorInfo(req, res));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
