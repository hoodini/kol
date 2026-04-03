<div align="center">

# מדריך התקנה צעד אחר צעד 🇮🇱

### Kol (קול) — סטודיו תמלול מקצועי

**מדריך לכל אחד — גם אם אף פעם לא פתחת טרמינל**

**תומך ב: 🍎 Mac · 🪟 Windows · 🐧 Linux**

</div>

---

## מה זה בכלל?

**קול** הוא כלי שמאפשר לך לתמלל כל קובץ אודיו או וידאו — הוא מקשיב ומוציא טקסט כתוב. אפשר להדביק לינק של סרטון YouTube ולקבל את כל הטקסט שנאמר בו, עם חותמות זמן מדויקות, מוכן לייצוא ככתוביות לכל תוכנת עריכה.

### מה צריך לפני שמתחילים?

- **מחשב** (Mac, Windows 10/11, או Linux)
- **חיבור אינטרנט** (להורדת הכלים)
- **30 דקות** של סבלנות
- **מפתח API** (חינמי!) לאחד מהשירותים — נסביר בדיוק איך

### באיזו מערכת הפעלה אתם?

> 💡 **לא בטוחים?**
> - אם יש לכם מחשב עם תפוח — זה **Mac**
> - אם קניתם מחשב רגיל — כנראה **Windows**
> - אם אתם יודעים שזה Linux — אתם כבר לא צריכים את ההסבר הזה 😄

---

## שלב 1: התקנת הכלים הבסיסיים

### 1.1 — פתיחת הטרמינל

> **מה זה טרמינל?** זו תוכנה שמאפשרת להקליד פקודות למחשב. זה נשמע מפחיד אבל זה פשוט העתק-הדבק.

<details>
<summary><b>🍎 Mac</b></summary>

לחצו `Cmd + Space`, הקלידו `Terminal`, ולחצו Enter.
תיפתח חלון עם מקום להקליד.

</details>

<details>
<summary><b>🪟 Windows</b></summary>

1. לחצו `Win + X` (כפתור Windows + האות X)
2. בחרו **"Windows Terminal"** או **"PowerShell"**
3. אם אין — לחצו `Win + R`, הקלידו `cmd`, ולחצו Enter

> 💡 **מומלץ מאוד:** התקינו את [Windows Terminal](https://apps.microsoft.com/detail/9n0dx20hk701) מהחנות של מייקרוסופט — הרבה יותר נוח.

</details>

<details>
<summary><b>🐧 Linux</b></summary>

לחצו `Ctrl + Alt + T` — זה פותח טרמינל ברוב ההפצות.

</details>

---

### 1.2 — התקנת Python, Node.js, ffmpeg, yt-dlp

> **מה כל אחד עושה?**
> - `python` — שפת התכנות שה-backend כתוב בה
> - `node` — שפת התכנות שה-frontend (האתר) כתוב בה
> - `ffmpeg` — כלי שממיר בין פורמטים של אודיו ווידאו
> - `yt-dlp` — כלי שמוריד סרטונים מ-YouTube ומעוד 1000 אתרים
> - `git` — כלי שמוריד קוד מ-GitHub

<details>
<summary><b>🍎 Mac</b></summary>

**שלב א — התקינו Homebrew** (מנהל חבילות, כמו App Store לכלים טכניים):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

חכו 2-5 דקות. אם מבקש סיסמה — הקלידו את סיסמת המחשב.

**שלב ב — התקינו את הכלים:**

```bash
brew install python node ffmpeg yt-dlp git
```

**שלב ג — וודאו שהכל עובד:**

```bash
python3 --version && node --version && ffmpeg -version | head -1 && yt-dlp --version
```

אם מופיעים 4 מספרי גרסאות — הכל מותקן! ✅

</details>

<details>
<summary><b>🪟 Windows</b></summary>

ב-Windows, ההתקנה קצת שונה. יש שתי דרכים — בחרו אחת:

#### דרך א — התקנה ידנית (הכי פשוט למי שלא מכיר)

1. **Python:** היכנסו ל-[python.org/downloads](https://python.org/downloads), לחצו `Download Python`, והריצו את ההתקנה.
   - ⚠️ **חשוב!** סמנו את ✅ **"Add Python to PATH"** במסך הראשון של ההתקנה!

2. **Node.js:** היכנסו ל-[nodejs.org](https://nodejs.org), הורידו את גרסת **LTS**, והריצו את ההתקנה.

3. **Git:** היכנסו ל-[git-scm.com/download/win](https://git-scm.com/download/win), הורידו והתקינו. בכל המסכים פשוט לחצו Next.

4. **ffmpeg:**
   - היכנסו ל-[gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/)
   - הורידו את `ffmpeg-release-essentials.zip`
   - חלצו את הקובץ לתיקייה `C:\ffmpeg`
   - הוסיפו ל-PATH:
     - לחצו `Win + R`, הקלידו `sysdm.cpl`, לחצו Enter
     - לשונית `Advanced` → `Environment Variables`
     - ב-`Path` לחצו `Edit` → `New` → הקלידו `C:\ffmpeg\bin`
     - לחצו OK OK OK

5. **yt-dlp:** פתחו PowerShell והריצו:
   ```powershell
   pip install yt-dlp
   ```

#### דרך ב — עם winget (מהיר, למי שמכיר)

פתחו PowerShell **כמנהל** (right-click → Run as Administrator):

```powershell
winget install Python.Python.3.13
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Gyan.FFmpeg
pip install yt-dlp
```

> 💡 **חשוב:** אחרי ההתקנות, **סגרו את הטרמינל ופתחו חדש** כדי שהמחשב יזהה את הכלים החדשים.

**וודאו שהכל עובד:**

```powershell
python --version && node --version && ffmpeg -version 2>&1 | Select-Object -First 1 && yt-dlp --version
```

</details>

<details>
<summary><b>🐧 Linux (Ubuntu/Debian)</b></summary>

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm ffmpeg git
pip3 install yt-dlp
```

**Fedora/RHEL:**
```bash
sudo dnf install python3 python3-pip nodejs npm ffmpeg git
pip3 install yt-dlp
```

**Arch:**
```bash
sudo pacman -S python nodejs npm ffmpeg git yt-dlp
```

**וודאו שהכל עובד:**

```bash
python3 --version && node --version && ffmpeg -version | head -1 && yt-dlp --version
```

</details>

---

## שלב 2: הורדת הפרויקט

<details>
<summary><b>🍎 Mac / 🐧 Linux</b></summary>

```bash
cd ~/Desktop
git clone https://github.com/hoodini/kol.git
cd kol
```

</details>

<details>
<summary><b>🪟 Windows</b></summary>

```powershell
cd $HOME\Desktop
git clone https://github.com/hoodini/kol.git
cd kol
```

> 💡 **אלטרנטיבה:** אם `git` לא עובד, תוכלו פשוט [להוריד כ-ZIP](https://github.com/hoodini/kol/archive/refs/heads/master.zip), לחלץ לשולחן העבודה, ולפתוח את התיקייה.

</details>

> **מה קרה?** הורדנו את כל הקוד של קול לתיקייה חדשה על שולחן העבודה.

---

## שלב 3: הגדרת ה-Backend (השרת)

### 3.1 — יצירת סביבת Python מבודדת

> **מה זה venv?** סביבה מבודדת שמונעת התנגשויות בין חבילות Python שונות. תמיד צריך "להפעיל" אותה לפני עבודה.

<details>
<summary><b>🍎 Mac / 🐧 Linux</b></summary>

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

> תראו `(.venv)` בתחילת השורה בטרמינל — זה אומר שהסביבה פעילה. ✅

</details>

<details>
<summary><b>🪟 Windows (PowerShell)</b></summary>

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> ⚠️ **אם מופיעה שגיאה על "execution policy"**, הריצו קודם:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> ואז נסו שוב את `Activate.ps1`.

> תראו `(.venv)` בתחילת השורה — זה אומר שזה עובד. ✅

</details>

<details>
<summary><b>🪟 Windows (CMD — שורת פקודה רגילה)</b></summary>

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate.bat
```

</details>

### 3.2 — התקנת החבילות

```bash
pip install -r requirements.txt
```

> זה מתקין את כל הספריות שקול צריך. ייקח 1-3 דקות.

### 3.3 — יצירת קובץ ההגדרות

<details>
<summary><b>🍎 Mac / 🐧 Linux</b></summary>

```bash
cp .env.example .env
```

</details>

<details>
<summary><b>🪟 Windows</b></summary>

```powershell
copy .env.example .env
```

</details>

> **מה זה?** יצרנו קובץ שבו נשמור את מפתחות ה-API. הקובץ הזה **חייב להישאר בתיקיית `backend/`** והוא **לא עולה לאינטרנט** — הוא פרטי לגמרי.

---

## שלב 4: הוספת מפתחות API

> **למה צריך מפתח API?** שירותי התמלול בענן (Groq, Gemini, HuggingFace) דורשים מפתח כדי לזהות אתכם. זה כמו סיסמה שמאפשרת לכם להשתמש בשירות. **כל השירותים מציעים שימוש חינמי!**

### איזה שירות לבחור?

| שירות | עלות | מהירות | דיוק בעברית | מומלץ ל... |
|--------|-------|---------|-------------|-----------|
| **Groq** | חינם (הכי כדאי!) | מהיר מאוד | טוב | רוב האנשים ⭐ |
| **Google Gemini** | חינם | מהיר | טוב | מי שרוצה גם הקשר |
| **HuggingFace** | חינם | בינוני | הכי טוב לעברית | תמלול עברית מושלם |

**ממליצים להתחיל עם Groq** — הכי מהיר, הכי קל, חינמי.

> **💡 שימו לב:** ב-Groq בחשבון חינמי יש מגבלה של 20 בקשות בדקה. קול מטפל בזה אוטומטית — הוא מרווח את הבקשות כדי לא לחרוג מהמגבלה, אז תמלול של קבצים ארוכים עשוי לקחת קצת יותר זמן. אם אתם רואים הודעות על "rate limit" בלוגים — זה נורמלי, קול ינסה שוב אוטומטית.

---

### 4A: יצירת מפתח Groq (מומלץ!) ⭐

**Groq** הוא שירות שמריץ מודלים של AI במהירות מטורפת. הוא מריץ את Whisper (מודל התמלול של OpenAI) ב-299 מהירות בזמן אמת.

#### שלב אחר שלב:

1. **היכנסו ל-** [console.groq.com](https://console.groq.com)

2. **הירשמו** — לחצו `Sign Up`, אפשר עם חשבון Google

3. **עברו לדף API Keys:**
   - בתפריט השמאלי לחצו על `API Keys`
   - או היכנסו ישירות ל- [console.groq.com/keys](https://console.groq.com/keys)

4. **צרו מפתח חדש:**
   - לחצו `Create API Key`
   - תנו שם, למשל `kol-transcription`
   - לחצו `Submit`

5. **העתיקו את המפתח!**
   - יופיע מפתח שמתחיל ב-`gsk_...`
   - ⚠️ **העתיקו אותו עכשיו** — הוא מוצג רק פעם אחת!

6. **הדביקו בקובץ ההגדרות:**

<details>
<summary><b>🍎 Mac / 🐧 Linux</b></summary>

```bash
nano .env
```
מצאו את השורה `GROQ_API_KEY=` והדביקו את המפתח:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```
שמרו: `Ctrl+O`, `Enter`, `Ctrl+X`

</details>

<details>
<summary><b>🪟 Windows</b></summary>

**דרך א — עם Notepad (הכי פשוט):**
```powershell
notepad .env
```
מצאו את השורה `GROQ_API_KEY=` והדביקו את המפתח:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```
שמרו (`Ctrl+S`) וסגרו.

**דרך ב — מהטרמינל:**
```powershell
(Get-Content .env) -replace '^GROQ_API_KEY=.*', 'GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx' | Set-Content .env
```
(החליפו את `gsk_xxxxxxxxxxxxxxxxxxxx` במפתח שלכם)

</details>

---

### 4B: יצירת מפתח Google Gemini

**Gemini** הוא מודל ה-AI של Google. הוא טוב לתמלול כי הוא מבין הקשר ויכול להבדיל בין דוברים.

#### שלב אחר שלב:

1. **היכנסו ל-** [aistudio.google.com](https://aistudio.google.com)

2. **היכנסו עם חשבון Google** (Gmail)

3. **עברו לדף API Keys:**
   - לחצו בתפריט על `Get API Key`
   - או היכנסו ישירות ל- [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

4. **צרו מפתח:**
   - לחצו `Create API Key`
   - בחרו פרויקט (אם אין — ייווצר אוטומטית)
   - לחצו `Create API Key in new project`

5. **העתיקו את המפתח:**
   - יופיע מפתח שמתחיל ב-`AIza...`
   - העתיקו אותו

6. **הדביקו בקובץ ההגדרות** (כמו בשלב 4A — פתחו את `.env` והדביקו):
   ```
   GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

### 4C: יצירת מפתח HuggingFace (לתמלול עברית מדויק)

**HuggingFace** היא פלטפורמה לשיתוף מודלים של AI. דרכה אפשר לגשת ל-**ivrit-ai** — מודל שאומן על 22,000 שעות של אודיו בעברית, ולכן הוא הכי מדויק לתמלול עברית.

#### שלב אחר שלב:

1. **היכנסו ל-** [huggingface.co](https://huggingface.co)

2. **הירשמו** — לחצו `Sign Up` למעלה

3. **עברו להגדרות Token:**
   - לחצו על האווטאר שלכם (למעלה מימין)
   - בחרו `Settings`
   - בתפריט השמאלי: `Access Tokens`
   - או היכנסו ישירות ל- [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

4. **צרו Token חדש:**
   - לחצו `Create new token`
   - שם: `kol-transcription`
   - סוג: `Read` (מספיק!)
   - לחצו `Create token`

5. **העתיקו את ה-Token:**
   - יופיע token שמתחיל ב-`hf_...`
   - העתיקו אותו

6. **הדביקו בקובץ ההגדרות** (כמו בשלב 4A — פתחו את `.env` והדביקו):
   ```
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
   ```

---

## שלב 5: הגדרת ה-Frontend (האתר)

<details>
<summary><b>🍎 Mac / 🐧 Linux</b></summary>

```bash
cd ../frontend
npm install
```

</details>

<details>
<summary><b>🪟 Windows</b></summary>

```powershell
cd ..\frontend
npm install
```

</details>

> זה מתקין את כל מה שהאתר צריך. ייקח 1-2 דקות.

---

## שלב 6: הפעלה! 🚀

צריך **שני חלונות טרמינל** (פתחו חלון נוסף):

### חלון 1 — השרת (Backend):

<details>
<summary><b>🍎 Mac / 🐧 Linux</b></summary>

```bash
cd ~/Desktop/kol/backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

</details>

<details>
<summary><b>🪟 Windows (PowerShell)</b></summary>

```powershell
cd $HOME\Desktop\kol\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

</details>

<details>
<summary><b>🪟 Windows (CMD)</b></summary>

```cmd
cd %USERPROFILE%\Desktop\kol\backend
.venv\Scripts\activate.bat
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

</details>

> ✅ אמור להופיע: `🎙️ Kol (קול) is ready!`

### חלון 2 — האתר (Frontend):

<details>
<summary><b>🍎 Mac / 🐧 Linux</b></summary>

```bash
cd ~/Desktop/kol/frontend
npm run dev
```

</details>

<details>
<summary><b>🪟 Windows</b></summary>

```powershell
cd $HOME\Desktop\kol\frontend
npm run dev
```

</details>

> ✅ אמור להופיע: `Ready on http://localhost:3000`

### 6.1 — פתחו בדפדפן:

**http://localhost:3000**

🎉 **זהו! קול רץ!**

---

## מה עכשיו?

### לתמלל קובץ:
1. לחצו על **"תמלול חדש"** בסרגל הצד
2. גררו קובץ אודיו/וידאו לאזור ההעלאה
3. בחרו מנוע (Groq מומלץ) ושפה (עברית)
4. לחצו **"התחל תמלול"**
5. עברו ל"פרויקטים" — תמתינו שהסטטוס ישתנה ל"הושלם"
6. לחצו על הפרויקט — ייפתח ה-Correction Studio

### לתמלל מ-YouTube:
1. לחצו על **"מ-YouTube / URL"** בסרגל הצד
2. הדביקו קישור, למשל: `https://www.youtube.com/watch?v=...`
3. לחצו **"בדוק"** — יופיעו פרטי הסרטון
4. לחצו **"הורד ותמלל"**
5. המתינו בדף הפרויקטים — הכל אוטומטי!

### לייצא כתוביות:
1. ב-Correction Studio, לחצו על **"ייצוא"**
2. בחרו פורמט:
   - **SRT** — ל-Premiere Pro, DaVinci Resolve, YouTube
   - **VTT** — לאתרי אינטרנט
   - **TXT** — טקסט נקי בלי חותמות זמן
   - **ASS** — לסגנון מתקדם (Aegisub)
   - **JSON** — למפתחים

---

## פתרון בעיות נפוצות

### כל מערכות ההפעלה:

| בעיה | פתרון |
|------|-------|
| "הטרמינל לא מזהה את הפקודה" | סגרו את הטרמינל ופתחו חדש. אם לא עוזר — ראו פתרון ספציפי למטה |
| "השרת לא מתחבר" | בדקו שהטרמינל הראשון (backend) מראה `Kol is ready!` |
| "המנוע לא זמין" | כנסו להגדרות ובדקו שמפתח ה-API מסומן כ-"מוגדר" |
| "התמלול לא מדויק" | נסו מנוע אחר. לעברית, ivrit-ai נותן את התוצאות הכי טובות |
| "Port 8000 already in use" | תהליך ישן עדיין רץ. ראו פתרון למטה |

### 🍎 Mac — בעיות ספציפיות:

<details>
<summary>Homebrew לא מזוהה אחרי ההתקנה</summary>

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile
```

</details>

<details>
<summary>Port 8000 תפוס</summary>

```bash
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

</details>

### 🪟 Windows — בעיות ספציפיות:

<details>
<summary>"python" או "pip" לא מזוהה</summary>

Python לא נוסף ל-PATH. שתי אפשרויות:

**אפשרות א:** התקינו מחדש מ-[python.org](https://python.org/downloads) וסמנו ✅ **"Add Python to PATH"**

**אפשרות ב:** הוסיפו ידנית:
```powershell
# מצאו איפה Python מותקן:
where.exe python
# אם לא נמצא, נסו:
$env:PATH += ";$env:LOCALAPPDATA\Programs\Python\Python313;$env:LOCALAPPDATA\Programs\Python\Python313\Scripts"
```

</details>

<details>
<summary>"Activate.ps1 cannot be loaded" — שגיאת execution policy</summary>

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
ואז נסו שוב.

</details>

<details>
<summary>"ffmpeg" לא מזוהה</summary>

וודאו ש-ffmpeg נמצא ב-PATH:
```powershell
# בדקו:
where.exe ffmpeg
# אם לא נמצא, הוסיפו (שנו את הנתיב אם צריך):
$env:PATH += ";C:\ffmpeg\bin"
# להוספה קבועה:
[Environment]::SetEnvironmentVariable("Path", $env:PATH + ";C:\ffmpeg\bin", "User")
```

</details>

<details>
<summary>Port 8000 תפוס</summary>

```powershell
netstat -ano | findstr :8000
# מצאו את ה-PID (המספר האחרון) והרגו את התהליך:
taskkill /PID <PID> /F
```

</details>

### 🐧 Linux — בעיות ספציפיות:

<details>
<summary>"externally-managed-environment" בהתקנת pip</summary>

```bash
# השתמשו ב-venv (כמו שהמדריך מלמד) או:
pip3 install --break-system-packages yt-dlp
```

</details>

<details>
<summary>Port 8000 תפוס</summary>

```bash
sudo kill -9 $(sudo lsof -t -i:8000)
```

</details>

---

## כמה זה עולה?

**כלום!** לרוב השימושים, הכל חינמי:

- **Groq**: 14,400 שניות אודיו ביום = **4 שעות חינם כל יום**
- **Gemini**: 15 בקשות בדקה, 1,500 ביום = **שעות רבות חינם**
- **HuggingFace**: Inference API חינמי עם מגבלות קטנות
- **Whisper מקומי**: חינם לגמרי, תמיד (רק צריך מחשב חזק)

---

## הפעלה מחדש (פעם הבאה שתרצו להשתמש)

כל פעם שתרצו להשתמש בקול, צריך להפעיל את שני השרתים:

<details>
<summary><b>🍎 Mac / 🐧 Linux</b></summary>

**טרמינל 1:**
```bash
cd ~/Desktop/kol/backend && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**טרמינל 2:**
```bash
cd ~/Desktop/kol/frontend && npm run dev
```

</details>

<details>
<summary><b>🪟 Windows</b></summary>

**PowerShell 1:**
```powershell
cd $HOME\Desktop\kol\backend; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**PowerShell 2:**
```powershell
cd $HOME\Desktop\kol\frontend; npm run dev
```

</details>

ופתחו **http://localhost:3000** בדפדפן. זהו!

---

<div align="center">

נבנה על ידי [Yuval Avidani](https://yuv.ai) · [GitHub](https://github.com/hoodini) · [X](https://x.com/yuvalav) · [LinkTree](https://linktr.ee/yuvai)

</div>
