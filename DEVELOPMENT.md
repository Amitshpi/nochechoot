# מדריך פיתוח - מערכת Shmirot

## סביבת פיתוח מומלצת

### 1. Visual Studio Code
```bash
# התקנה
winget install Microsoft.VisualStudioCode

# הרצה
code .
```

### 2. Extensions מומלצים
- **JavaScript (ES6) code snippets**
- **ES7+ React/Redux/React-Native snippets**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**
- **GitLens**

## הרצה מקומית

### Backend
```bash
# תיקיית שורש
node index.js
```

### Frontend
```bash
# תיקיית client
cd client
npm start
```

## מבנה הקבצים לעריכה

### Backend (Node.js/Express)
- `index.js` - שרת Express, API endpoints
- `db.js` - חיבור למסד נתונים SQLite
- `package.json` - תלויות Backend

### Frontend (React)
- `client/src/App.js` - קומפוננטה ראשית
- `client/src/App.css` - עיצוב CSS
- `client/public/` - קבצים סטטיים

## סוגי עריכות נפוצות

### 1. שינוי טקסטים
**מיקום**: `client/src/App.js`
```javascript
// שינוי כותרות
<h1>כותרת חדשה</h1>

// שינוי כפתורים
<button>טקסט כפתור חדש</button>
```

### 2. הוספת שדות
**Backend**: `index.js` - הוספת API endpoint
**Frontend**: `client/src/App.js` - הוספת input field

### 3. שינוי עיצוב
**מיקום**: `client/src/App.css`
```css
/* שינוי צבעים */
.button {
  background-color: #new-color;
}

/* שינוי גודל */
.container {
  max-width: 1200px;
}
```

### 4. הוספת פיצ'רים
1. **Backend**: הוסף API endpoint ב-`index.js`
2. **Frontend**: הוסף UI ב-`client/src/App.js`
3. **Database**: עדכן סכמה ב-`db.js` (אם נדרש)

## דיבוג

### Backend
```bash
# הרצה עם דיבוג
node --inspect index.js
```

### Frontend
- פתח Developer Tools בדפדפן (F12)
- Console לבדיקת שגיאות
- Network לבדיקת API calls

## Git Workflow

### עדכון קוד
```bash
# הוספת שינויים
git add .

# commit
git commit -m "תיאור השינוי"

# דחיפה ל-GitHub
git push origin main
```

### גיבוי
```bash
# יצירת branch חדש
git checkout -b feature/new-feature

# עבודה על השינוי
# ...

# merge חזרה
git checkout main
git merge feature/new-feature
```

## טיפים לפיתוח

### 1. בדיקה מהירה
- שינוי קטן → בדיקה בדפדפן → commit
- אל תחכה עם שינויים גדולים

### 2. גיבוי תכוף
- commit כל שינוי משמעותי
- push ל-GitHub לפחות פעם ביום

### 3. תיעוד
- תעד שינויים ב-README.md
- הוסף הערות בקוד בעברית

### 4. בדיקות
- בדוק שהמערכת עובדת אחרי כל שינוי
- בדוק על דפדפנים שונים

## פתרון בעיות נפוצות

### "Port already in use"
```bash
# עצירת תהליכים
taskkill /f /im node.exe

# או שינוי פורט
$env:PORT=4001; node index.js
```

### "Module not found"
```bash
# התקנת תלויות
npm install
cd client && npm install
```

### React לא מתעדכן
```bash
# עצירת שרת
Ctrl+C

# הפעלה מחדש
npm start
```

## קישורים שימושיים

- [React Documentation](https://reactjs.org/docs/)
- [Express Documentation](https://expressjs.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS) 