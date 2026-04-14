const express = require('express');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 10000;

// ─── ADMIN PASSWORD ───────────────────────────────────────────────────────────
// To generate a new hash, run once in Node:
//   require('bcryptjs').hashSync('your-password', 12)
// Then set the result as ADMIN_PASSWORD_HASH in your environment variables.
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
if (!ADMIN_PASSWORD_HASH) {
  console.error('FATAL: ADMIN_PASSWORD_HASH env variable is not set. Refusing to start.');
  process.exit(1);
}

// ─── ALLOWED MIME TYPES FOR UPLOADS ──────────────────────────────────────────
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// ─── FILE STORAGE ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXTS.has(ext)) {
      return cb(new Error('Only image files (jpg, png, webp, gif) are allowed.'));
    }
    cb(null, true);
  }
});

// ─── APP SETUP ────────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── SESSION ──────────────────────────────────────────────────────────────────
if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET env variable is not set. Refusing to start.');
  process.exit(1);
}
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  }
}));

// ─── CSRF PROTECTION ─────────────────────────────────────────────────────────
// Lightweight double-submit CSRF token (no csurf dependency needed)
// Sets a token in the session and exposes a helper for views.
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

function csrfCheck(req, res, next) {
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).send('Invalid CSRF token.');
  }
  next();
}

// ─── ADMIN AUTH MIDDLEWARE ────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  if (req.session && req.session.isAdmin === true) return next();
  res.redirect('/admin/login');
}

// ─── INPUT FIELD LIMITS ───────────────────────────────────────────────────────
const MAX_TEXT = 500;

const paintingValidators = [
  body('title_he').trim().isLength({ max: MAX_TEXT }).escape(),
  body('title_en').trim().isLength({ max: MAX_TEXT }).escape(),
  body('technique_he').trim().isLength({ max: MAX_TEXT }).escape(),
  body('technique_en').trim().isLength({ max: MAX_TEXT }).escape(),
  body('year').trim().isLength({ max: 4 }).matches(/^\d{0,4}$/),
  body('size').trim().isLength({ max: 100 }).escape(),
  body('category').trim().isIn(['acrylic', 'pastel', 'charcoal', 'other', 'exhibitions'])
];

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

app.get(['/', '/:lang(he|en)'], (req, res) => {
  const lang = req.params.lang || 'he';
  res.render('index', { lang });
});

app.get(['/:lang(he|en)/gallery', '/gallery'], (req, res) => {
  const lang = req.params.lang || 'he';
  const categories = ['acrylic', 'pastel', 'charcoal', 'other'];
  const results = {};
  let done = 0;
  categories.forEach(cat => {
    db.all('SELECT * FROM paintings WHERE category = ? ORDER BY sort_order ASC, id ASC', [cat], (err, rows) => {
      results[cat] = rows || [];
      done++;
      if (done === categories.length) {
        res.render('gallery', { lang, categories: results });
      }
    });
  });
});

app.get(['/:lang(he|en)/exhibitions', '/exhibitions'], (req, res) => {
  const lang = req.params.lang || 'he';
  db.all("SELECT * FROM paintings WHERE category = 'exhibitions' ORDER BY sort_order ASC, id ASC", [], (err, rows) => {
    res.render('exhibitions', { lang, paintings: rows || [] });
  });
});

app.get(['/:lang(he|en)/about', '/about'], (req, res) => {
  const lang = req.params.lang || 'he';
  db.get('SELECT * FROM about WHERE id = 1', [], (err, row) => {
    res.render('about', { lang, about: row || { content_he: '', content_en: '' } });
  });
});

app.get(['/:lang(he|en)/contact', '/contact'], (req, res) => {
  const lang = req.params.lang || 'he';
  res.render('contact', { lang, sent: false, error: false });
});

app.post(
  ['/:lang(he|en)/contact', '/contact'],
  [
    body('name').trim().isLength({ min: 1, max: 200 }).escape(),
    body('email').trim().isEmail().normalizeEmail(),
    body('message').trim().isLength({ min: 1, max: 2000 }).escape()
  ],
  async (req, res) => {
    const lang = req.params.lang || 'he';
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('contact', { lang, sent: false, error: true });
    }

    const { name, email, message } = req.body;

    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.error('Mail credentials not configured.');
      return res.render('contact', { lang, sent: false, error: true });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        }
      });
      await transporter.sendMail({
        from: `"Gallery Contact" <${process.env.MAIL_USER}>`, // must be authed sender
        replyTo: email,
        to: process.env.MAIL_USER,
        subject: `Gallery Contact: ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`
      });
      res.render('contact', { lang, sent: true, error: false });
    } catch (e) {
      console.error('Mail send error:', e.message);
      res.render('contact', { lang, sent: false, error: true });
    }
  }
);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { lang: 'he', error: false, csrfToken: res.locals.csrfToken });
});

app.post(
  '/admin/login',
  csrfCheck,
  [body('password').notEmpty()],
  async (req, res) => {
    const { password } = req.body;
    const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (match) {
      req.session.regenerate((err) => {
        if (err) return res.render('admin/login', { lang: 'he', error: true });
        req.session.isAdmin = true;
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
        res.redirect('/admin');
      });
    } else {
      // Small delay to blunt brute-force attempts
      setTimeout(() => res.render('admin/login', { lang: 'he', error: true }), 500);
    }
  }
);

app.post('/admin/logout', adminAuth, csrfCheck, (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/admin/logout', adminAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/admin', adminAuth, (req, res) => {
  res.render('admin/dashboard', { lang: 'he' });
});

// Upload paintings
app.get('/admin/upload', adminAuth, (req, res) => {
  const suggestions = {};
  db.all('SELECT value FROM autocomplete_titles', [], (err, rows) => {
    suggestions.titles = (rows || []).map(r => r.value);
    db.all('SELECT value FROM autocomplete_techniques', [], (err2, rows2) => {
      suggestions.techniques = (rows2 || []).map(r => r.value);
      db.all('SELECT value FROM autocomplete_sizes', [], (err3, rows3) => {
        suggestions.sizes = (rows3 || []).map(r => r.value);
        res.render('admin/upload', { lang: 'he', suggestions });
      });
    });
  });
});

app.post('/admin/upload', adminAuth, csrfCheck, upload.array('images', 50), paintingValidators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).send('Invalid input.');

  const { category, title_he, title_en, technique_he, technique_en, year, size } = req.body;
  const files = req.files || [];

  if (title_he) db.run('INSERT OR IGNORE INTO autocomplete_titles (value) VALUES (?)', [title_he]);
  if (title_en) db.run('INSERT OR IGNORE INTO autocomplete_titles (value) VALUES (?)', [title_en]);
  if (technique_he) db.run('INSERT OR IGNORE INTO autocomplete_techniques (value) VALUES (?)', [technique_he]);
  if (technique_en) db.run('INSERT OR IGNORE INTO autocomplete_techniques (value) VALUES (?)', [technique_en]);
  if (size) db.run('INSERT OR IGNORE INTO autocomplete_sizes (value) VALUES (?)', [size]);

  if (files.length === 0) return res.redirect('/admin/upload');

  let done = 0;
  files.forEach((file, i) => {
    db.run(
      'INSERT INTO paintings (title_he, title_en, technique_he, technique_en, year, size, category, filename, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
      [title_he || '', title_en || '', technique_he || '', technique_en || '', year || '', size || '', category || 'other', file.filename, i],
      () => { done++; if (done === files.length) res.redirect('/admin/manage'); }
    );
  });
});

// Manage paintings
app.get('/admin/manage', adminAuth, (req, res) => {
  db.all('SELECT * FROM paintings ORDER BY category, sort_order ASC, id ASC', [], (err, rows) => {
    const suggestions = {};
    db.all('SELECT value FROM autocomplete_titles', [], (err2, r2) => {
      suggestions.titles = (r2 || []).map(r => r.value);
      db.all('SELECT value FROM autocomplete_techniques', [], (err3, r3) => {
        suggestions.techniques = (r3 || []).map(r => r.value);
        db.all('SELECT value FROM autocomplete_sizes', [], (err4, r4) => {
          suggestions.sizes = (r4 || []).map(r => r.value);
          res.render('admin/manage', { lang: 'he', paintings: rows || [], suggestions });
        });
      });
    });
  });
});

app.post('/admin/edit/:id',
  adminAuth,
  csrfCheck,
  param('id').isInt({ min: 1 }),
  paintingValidators,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).send('Invalid input.');

    const { title_he, title_en, technique_he, technique_en, year, size, category } = req.body;

    if (title_he) db.run('INSERT OR IGNORE INTO autocomplete_titles (value) VALUES (?)', [title_he]);
    if (title_en) db.run('INSERT OR IGNORE INTO autocomplete_titles (value) VALUES (?)', [title_en]);
    if (technique_he) db.run('INSERT OR IGNORE INTO autocomplete_techniques (value) VALUES (?)', [technique_he]);
    if (technique_en) db.run('INSERT OR IGNORE INTO autocomplete_techniques (value) VALUES (?)', [technique_en]);
    if (size) db.run('INSERT OR IGNORE INTO autocomplete_sizes (value) VALUES (?)', [size]);

    db.run(
      'UPDATE paintings SET title_he=?, title_en=?, technique_he=?, technique_en=?, year=?, size=?, category=? WHERE id=?',
      [title_he, title_en, technique_he, technique_en, year, size, category, parseInt(req.params.id)],
      () => res.redirect('/admin/manage')
    );
  }
);

app.post('/admin/delete/:id',
  adminAuth,
  csrfCheck,
  param('id').isInt({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).send('Invalid ID.');
    db.run('DELETE FROM paintings WHERE id = ?', [parseInt(req.params.id)], () => res.redirect('/admin/manage'));
  }
);

app.post('/admin/reorder', adminAuth, csrfCheck, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.json({ ok: false });

  // Validate all entries are positive integers before touching the DB
  const ids = order.map(id => parseInt(id, 10));
  if (ids.some(id => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ ok: false, error: 'Invalid IDs' });
  }

  let done = 0;
  ids.forEach((id, i) => {
    db.run('UPDATE paintings SET sort_order = ? WHERE id = ?', [i, id], () => {
      done++;
      if (done === ids.length) res.json({ ok: true });
    });
  });
});

// About editor
app.get('/admin/about', adminAuth, (req, res) => {
  db.get('SELECT * FROM about WHERE id = 1', [], (err, row) => {
    res.render('admin/about', { lang: 'he', about: row || { content_he: '', content_en: '' } });
  });
});

app.post('/admin/about',
  adminAuth,
  csrfCheck,
  [
    body('content_he').trim().isLength({ max: 10000 }),
    body('content_en').trim().isLength({ max: 10000 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).send('Invalid input.');
    const { content_he, content_en } = req.body;
    db.run(
      'UPDATE about SET content_he=?, content_en=?, updated_at=CURRENT_TIMESTAMP WHERE id=1',
      [content_he, content_en],
      () => res.redirect('/admin/about')
    );
  }
);

app.listen(PORT, () => console.log(`Gallery running on port ${PORT}`));
