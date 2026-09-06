# 🎓 TiT Academy — Auto Tech Challenge Quiz Game

A team-based automotive knowledge quiz game built for TiT Academy.

---

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | Main app — Start screen & Contestant screen |
| `judge.html` | Judge control panel (separate window) |
| `style.css` | All styles |
| `script.js` | Game logic & screen synchronization |
| `questions.js` | 20 automotive questions (medium difficulty) |
| `logo.svg` | TiT Academy logo |

---

## 🚀 How to Run

> **Important:** Must be opened via a local server (not by double-clicking the file).
> The judge/contestant sync uses `BroadcastChannel` which requires the same origin.

### Option 1 — VS Code Live Server
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → **"Open with Live Server"**
3. Browser opens at `http://localhost:5500`

### Option 2 — Python (quick)
```bash
cd C:\Users\PC\tit-academy-quiz
python -m http.server 8080
```
Open: `http://localhost:8080`

---

## 🎮 How to Play

### Start Screen
- **Left side**: Glowing TiT Academy logo
- **Right side**: Menu (Start Game, Settings, Teams, About)

### Contestant Screen (main display / projector)
- Shows the current question
- Options appear only when judge reveals them
- Glows **green** when correct, **red** when wrong

### Judge Panel (hidden)
- **Triple-click** the invisible button at the bottom-right of the start screen
  — OR — Open `judge.html` directly in a separate browser window on the **same browser**
- Shows current question + correct answer
- Controls: ✓ Correct / ✗ Wrong / 💡 Hint / Navigation / Team selector

### Sync between contestant & judge screens
- Both must be open in the **same browser** (different tabs or windows)
- Uses `BroadcastChannel` — no internet/server needed, just same origin

---

## 💡 Hint System (per question)

| Press | Effect on Contestant Screen |
|-------|----------------------------|
| 1st press | Reveals the 4 answer options |
| 2nd press | Shows Hint 1 |
| Max 2 hints per question |

---

## 📋 Questions Topics
- Engine components (camshaft, crankshaft, alternator...)
- Brake systems (ABS, pads, calipers...)
- Cooling & fuel systems
- Suspension & differentials
- Diagnostics (OBD, smoke colors, noises...)

---

## 🎨 Color Theme
| Color | Hex | Usage |
|-------|-----|-------|
| Navy Blue | `#0f2044` | Primary brand |
| Crimson Red | `#dc2626` | Accents, buttons |
| Slate Gray | `#64748b` | Subtitles, borders |
| Dark Navy Bg | `#0f172a` | Contestant background |
| Dark Charcoal | `#1f1f1f` | Judge background |
