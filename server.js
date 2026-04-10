const express = require('express');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 10000;

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp|bmp|tiff)|text\/html/;
    const extAllowed = /\.(jpe?g|png|gif|webp|bmp|tiff|html?|htm)$/i;
    if (allowed.test(file.mimetype) || extAllowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(null, false); // דחה בשקט — לא זורק שגיאה
    }
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple admin auth middleware
function adminAuth(req, res, next) {
  const cookie = req.headers.cookie || '';
  if (cookie.includes('admin_auth=123')) return next();
  res.redirect('/admin/login');
}

// ─── PUBLIC ROUTES ───────────────────────────────────────────────────────────

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
    res.render('exhibitions', { lang, paintings: rows || [], exContent: null });
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

app.post(['/:lang(he|en)/contact', '/contact'], async (req, res) => {
  const lang = req.params.lang || 'he';
  const { name, email, message } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER || 'doc.ift@gmail.com',
        pass: process.env.MAIL_PASS || ''
      }
    });
    await transporter.sendMail({
      from: email,
      to: 'doc.ift@gmail.com',
      subject: `Gallery Contact: ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`
    });
    res.render('contact', { lang, sent: true, error: false });
  } catch (e) {
    res.render('contact', { lang, sent: false, error: true });
  }
});

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

app.get('/admin/login', (req, res) => {
  res.render('admin/login', { lang: 'he', error: false });
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === '123') {
    res.setHeader('Set-Cookie', 'admin_auth=123; Path=/; HttpOnly');
    res.redirect('/admin');
  } else {
    res.render('admin/login', { lang: 'he', error: true });
  }
});

app.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.redirect('/');
});

app.get('/admin', adminAuth, (req, res) => {
  res.render('admin/dashboard', { lang: 'he' });
});

// Upload paintings
app.get('/admin/upload', adminAuth, (req, res) => {
  getSuggestions(suggestions => {
    res.render('admin/upload', { lang: 'he', suggestions, saved: req.query.saved === '1' });
  });
});

app.post('/admin/upload', adminAuth, upload.array('images', 50), (req, res) => {
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

// Manage paintings — always reload fresh from DB
app.get('/admin/manage', adminAuth, (req, res) => {
  db.all('SELECT * FROM paintings ORDER BY category, sort_order ASC, id ASC', [], (err, rows) => {
    getSuggestions(suggestions => {
      res.render('admin/manage', { lang: 'he', paintings: rows || [], suggestions });
    });
  });
});

// Edit painting — save then redirect back to manage (fresh DB load)
app.post('/admin/edit/:id', adminAuth, (req, res) => {
  const { title_he, title_en, technique_he, technique_en, year, size, category } = req.body;
  if (title_he) db.run('INSERT OR IGNORE INTO autocomplete_titles (value) VALUES (?)', [title_he]);
  if (title_en) db.run('INSERT OR IGNORE INTO autocomplete_titles (value) VALUES (?)', [title_en]);
  if (technique_he) db.run('INSERT OR IGNORE INTO autocomplete_techniques (value) VALUES (?)', [technique_he]);
  if (technique_en) db.run('INSERT OR IGNORE INTO autocomplete_techniques (value) VALUES (?)', [technique_en]);
  if (size) db.run('INSERT OR IGNORE INTO autocomplete_sizes (value) VALUES (?)', [size]);

  db.run(
    'UPDATE paintings SET title_he=?, title_en=?, technique_he=?, technique_en=?, year=?, size=?, category=? WHERE id=?',
    [title_he || '', title_en || '', technique_he || '', technique_en || '', year || '', size || '', category || 'other', req.params.id],
    (err) => {
      // redirect with cache-busting to force fresh page load
      res.redirect('/admin/manage?updated=' + Date.now());
    }
  );
});

app.post('/admin/delete/:id', adminAuth, (req, res) => {
  db.run('DELETE FROM paintings WHERE id = ?', [req.params.id], () => res.redirect('/admin/manage'));
});

app.post('/admin/reorder', adminAuth, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.json({ ok: false });
  let done = 0;
  order.forEach((id, i) => {
    db.run('UPDATE paintings SET sort_order = ? WHERE id = ?', [i, id], () => {
      done++;
      if (done === order.length) res.json({ ok: true });
    });
  });
});

// About editor
app.get('/admin/about', adminAuth, (req, res) => {
  db.get('SELECT * FROM about WHERE id = 1', [], (err, row) => {
    res.render('admin/about', { lang: 'he', about: row || { content_he: '', content_en: '' } });
  });
});

app.post('/admin/about', adminAuth, (req, res) => {
  const { content_he, content_en } = req.body;
  db.run('UPDATE about SET content_he=?, content_en=?, updated_at=CURRENT_TIMESTAMP WHERE id=1',
    [content_he, content_en],
    () => res.redirect('/admin/about')
  );
});

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getSuggestions(cb) {
  db.all('SELECT value FROM autocomplete_titles', [], (err, r1) => {
    db.all('SELECT value FROM autocomplete_techniques', [], (err2, r2) => {
      db.all('SELECT value FROM autocomplete_sizes', [], (err3, r3) => {
        cb({
          titles: (r1 || []).map(r => r.value),
          techniques: (r2 || []).map(r => r.value),
          sizes: (r3 || []).map(r => r.value)
        });
      });
    });
  });
}

app.get('/debug', (req,res) => res.json({dir: __dirname, files: require('fs').readdirSync(__dirname + '/public')}));
app.listen(PORT, () => console.log(`Gallery running on port ${PORT}`));
