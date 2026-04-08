# פרויקט גלריה — ד"ר יפתח שמש | הקשר ומידע

## על הפרויקט
אתר גלריה אישי לאמן ד"ר יפתח שמש.
רץ על Node.js + Express + EJS + SQLite.
מתארח על Render.com (פורט 10000).

## מבנה הפרויקט
```
gallery/
├── server.js          ← לוגיקת השרת
├── db.js              ← SQLite (gallery.db)
├── views/
│   ├── index.ejs      ← דף בית עם hero
│   ├── gallery.ejs    ← גלריה (4 קטגוריות)
│   ├── exhibitions.ejs← תערוכות + טקסט מעל גריד
│   ├── about.ejs      ← על אודות (ציבורי)
│   ├── contact.ejs    ← צור קשר
│   └── admin/
│       ├── _sidebar.ejs
│       ├── dashboard.ejs
│       ├── login.ejs
│       ├── upload.ejs
│       ├── manage.ejs
│       ├── about.ejs          ← עורך rich text
│       └── exhibitions-text.ejs ← עורך טקסט תערוכות
├── public/css/style.css
└── uploads/           ← תמונות (ephemeral על Render!)
```

## טכנולוגיות
- Backend: Node.js, Express, EJS, SQLite (sqlite3)
- Frontend: Vanilla JS, CSS custom properties
- גופנים: Cormorant Garamond + Heebo
- Drag & drop: SortableJS

## קטגוריות ציורים
- `acrylic` — אקריליק
- `pastel` — פסטל
- `charcoal` — פחם
- `other` — אחר
- `exhibitions` — תערוכות וכתבות

## שפות
האתר דו-לשוני: עברית (RTL) ואנגלית (LTR).
כל רכיב טקסט יש לו גרסה `_he` ו-`_en`.
מסלולים: `/:lang(he|en)/gallery` וכו׳.

## אדמין
- URL: `/admin` — סיסמה: `123`
- Cookie auth: `admin_auth=123`
- אפשרויות: העלאת ציורים, ניהול/עריכה/מחיקה, גרירה לסדר, עריכת "על אודות", עריכת טקסט תערוכות

## בעיות שנפתרו
1. **gallery.ejs חסר** — נוצר מחדש
2. **about.ejs (admin) חסר** — נוצר עם rich text editor
3. **תמונות נעלמות על Render** — ephemeral filesystem; פתרון: Cloudinary
4. **Cloudinary integration** — server.js עודכן עם multer-storage-cloudinary
5. **filename בDB** — ישן: שם קובץ בלבד; חדש: URL מלא של Cloudinary
   תאימות לאחור: `p.filename.startsWith('http') ? p.filename : '/uploads/' + p.filename`
6. **טקסט תערוכות** — טבלה `exhibitions_text` ב-DB + route + עורך ניהול

## בעיות פתוחות
- **SQLite נמחק על Render** — צריך Render Disk או מעבר ל-PostgreSQL
- **Cloudinary** — עדיין לא הוטמע בפועל (ממתין להרשמה + env vars)

## env vars נדרשים על Render
```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
MAIL_USER=doc.ift@gmail.com
MAIL_PASS=...
```

## packages נדרשים להוסיף
```bash
npm install cloudinary multer-storage-cloudinary
```

## סגנון CSS
- `--cream: #f5f0e8` — רקע
- `--gold: #c9a84c` — הדגשות
- `--dark: #1a1612` — טקסט כהה
- `--charcoal: #2d2926`
