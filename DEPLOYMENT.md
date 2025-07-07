# מדריך פריסה למערכת Shmirot

## אפשרות 1: Render (מומלץ - חינמי)

### שלב 1: הכנת הפרויקט
1. וודא שכל הקבצים נשמרו
2. וודא שה-React build נוצר: `cd client && npm run build`

### שלב 2: פריסה ב-Render
1. היכנס ל: https://render.com
2. צור חשבון חינמי
3. לחץ על "New +" ובחר "Web Service"
4. חבר את הפרויקט ל-GitHub (צור repository קודם)
5. הגדר:
   - **Name**: shmirot-backend
   - **Environment**: Node
   - **Build Command**: `npm install && cd client && npm install && npm run build`
   - **Start Command**: `node index.js`
   - **Plan**: Free

### שלב 3: הגדרת משתני סביבה
הוסף ב-Render:
- `NODE_ENV`: `production`
- `PORT`: `10000`

## אפשרות 2: Heroku

### שלב 1: התקנת Heroku CLI
```bash
# Windows
winget install --id=Heroku.HerokuCLI

# או הורד מ: https://devcenter.heroku.com/articles/heroku-cli
```

### שלב 2: התחברות ופריסה
```bash
heroku login
heroku create your-app-name
git add .
git commit -m "Initial deployment"
git push heroku main
```

## אפשרות 3: Vercel

### שלב 1: התקנת Vercel CLI
```bash
npm install -g vercel
```

### שלב 2: פריסה
```bash
vercel
```

## בדיקת הפריסה

לאחר הפריסה:
1. פתח את הכתובת שקיבלת
2. וודא שהמערכת עובדת
3. בדוק שכל הפיצ'רים עובדים

## פתרון בעיות

### בעיה: "Cannot find module"
**פתרון**: וודא שכל התלויות מותקנות:
```bash
npm install
cd client && npm install
```

### בעיה: "Port already in use"
**פתרון**: השתמש במשתנה סביבה PORT:
```bash
PORT=4000 node index.js
```

### בעיה: React לא נטען
**פתרון**: וודא שה-build נוצר:
```bash
cd client && npm run build
```

## קישורים שימושיים

- [Render Documentation](https://render.com/docs)
- [Heroku Documentation](https://devcenter.heroku.com/)
- [Vercel Documentation](https://vercel.com/docs) 