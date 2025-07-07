# מערכת ניהול יציאות למילואים (Shmirot)

מערכת לניהול בקשות יציאה למילואים עם ממשק משתמש בעברית.

## תכונות

- ניהול משתמשים עם תפקידים שונים
- הגשת בקשות יציאה
- אישור/דחייה של בקשות
- תצוגת נוכחות יומית ושבועית
- לוח שנה אינטראקטיבי
- ניהול תפקידים מותאם אישית
- סינון לפי פלוגות ומחלקות
- ייצוא נתונים

## התקנה מקומית

### דרישות
- Node.js (גרסה 14 ומעלה)
- npm

### שלבי התקנה

1. **שכפול הפרויקט**
```bash
git clone <repository-url>
cd shmirot
```

2. **התקנת תלויות Backend**
```bash
npm install
```

3. **התקנת תלויות Frontend**
```bash
cd client
npm install
cd ..
```

4. **הפעלת המערכת**
```bash
# Terminal 1 - Backend
node index.js

# Terminal 2 - Frontend
cd client
npm start
```

המערכת תהיה זמינה ב:
- Backend: http://localhost:4000
- Frontend: http://localhost:4001

## פריסה

### Heroku
1. צור חשבון ב-Heroku
2. התקן Heroku CLI
3. הרץ:
```bash
heroku create your-app-name
git add .
git commit -m "Initial deployment"
git push heroku main
```

### Vercel
1. צור חשבון ב-Vercel
2. התקן Vercel CLI
3. הרץ:
```bash
vercel
```

## שימוש

1. הוסף משתמשים ראשונים דרך הטאב "אנשים"
2. הגדר תפקידים דרך הטאב "תפקידים"
3. הגש בקשות יציאה דרך הטאב "בקשות יציאה"
4. צפה בנוכחות דרך הטאב "נוכחות"
5. השתמש בלוח השנה לתצוגה שבועית/חודשית

## מבנה הפרויקט

```
shmirot/
├── index.js          # שרת Express
├── database.db       # מסד נתונים SQLite
├── client/           # אפליקציית React
│   ├── src/
│   ├── public/
│   └── package.json
└── package.json
```

## API Endpoints

- `GET /api/users` - קבלת כל המשתמשים
- `POST /api/users` - הוספת משתמש חדש
- `GET /api/requests` - קבלת כל הבקשות
- `POST /api/requests` - הגשת בקשה חדשה
- `PUT /api/requests/:id` - עדכון בקשה
- `GET /api/presence` - נתוני נוכחות
- `GET /api/roles` - קבלת תפקידים
- `POST /api/roles` - הוספת תפקיד חדש

## רישיון

MIT License 