# גלריית ציורים — ד"ר יפתח שמש
# Art Gallery — Dr. Yiftach Shemesh

## מבנה הפרויקט / Project Structure

```
gallery/
├── server.js          # שרת ראשי / Main Express server
├── db.js              # הגדרת מסד נתונים SQLite
├── package.json
├── views/
│   ├── index.ejs      # דף הבית עם Hero
│   ├── gallery.ejs    # גלריה ציבורית
│   ├── about.ejs      # על אודות האמן
│   ├── exhibitions.ejs # תערוכות וכתבות
│   ├── contact.ejs    # צור קשר
│   └── admin/
│       ├── login.ejs
│       ├── dashboard.ejs
│       ├── upload.ejs     # העלאת תמונות
│       ├── manage.ejs     # ניהול וסידור
│       ├── about.ejs      # עריכת "על אודות"
│       └── _sidebar.ejs
├── public/
│   └── css/style.css
└── uploads/           # תמונות מועלות (נוצרת אוטומטית)
```

## התקנה / Installation

```bash
npm install
```

## הרצה מקומית / Local Run

```bash
npm start
# אוr
node server.js
```

## פריסה ב-Render / Deploy to Render

1. העלה ל-GitHub
2. חבר ב-Render כ-Web Service
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Environment Variables:
   - `PORT` — ייקבע אוטומטית על ידי Render
   - `MAIL_USER` — כתובת Gmail לשליחה (doc.ift@gmail.com)
   - `MAIL_PASS` — App Password של Gmail

## תמונת הרקע / Hero Image

העלה תמונה בשם `hero.jpg` לתיקיית `/uploads/`

## כניסת מנהל / Admin Access

- כתובת: `/admin/login`
- סיסמא: `123`

## הגנה משפטית / Legal Protection

כל הציורים המוצגים מוגנים בזכויות יוצרים של ד"ר יפתח שמש.
אין להעתיק, להפיץ, לשכפל או לעשות כל שימוש מסחרי בתמונות ללא אישור בכתב.

© Dr. Yiftach Shemesh — All Rights Reserved
