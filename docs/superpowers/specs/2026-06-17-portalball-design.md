# PortalBall.io — Design Spec

**Date:** 2026-06-17  
**Status:** Approved

---

## Overview

PortalBall.io ist ein Browser-Pinball-Spiel mit Portal-Gun-Mechanik. Der Spieler platziert per Linksklick/Tap blaue Portale auf dem Tisch. Der Tisch enthält vorplatzierte grüne (Teleport-Ausgang) und rote (Mini-Game-Trigger) Portale. Jeder Neustart generiert einen neuen, prozeduralen Tisch. Das Spiel ist primär für Mobile ausgelegt (Touch-first) und Capacitor-ready für spätere App-Konvertierung.

---

## Datei-Struktur

```
portalball.io/
├── index.html              # Shell, Canvas, UI-Overlays
├── style.css               # Neon-Cyberpunk Styles & Animationen
├── game.js                 # Gesamte Spiel-Logik
├── matter.min.js           # Lokale Matter.js Kopie (CDN-Fallback)
├── README.md
└── .github/workflows/deploy.yml
```

---

## Architektur

### State-Machine

Zentrale `GameState`-State-Machine in `game.js`. Alle State-Wechsel laufen über `transitionTo(state)`.

```
LAUNCH → PINBALL ⇄ MINIGAME_LABYRINTH
                 ⇄ MINIGAME_GRAVITY
                 ⇄ MINIGAME_MIRROR
         ↓
       GAME_OVER
```

- **LAUNCH:** Startscreen mit Highscore, Play-Button, Ball-Skin-Vorschau
- **PINBALL:** Matter.js aktiv, Flipper + Portal + Collectibles
- **MINIGAME_*:** Matter.js pausiert, Canvas-2D direkt gerendert
- **GAME_OVER:** Score-Anzeige, Münzen/Smaragde-Zusammenfassung, Restart

### Module-Namespaces in game.js

```js
const Physics     // Matter.js Setup & Welt
const Table       // Prozeduraler Tisch-Generator
const Portals     // Portal-Logik (blau/grün/rot)
const Collectibles// Münzen & Smaragde
const Bumpers     // Bumper + Multiplier
const Flippers    // Flipper-Steuerung
const Minigames = {
  Labyrinth,
  Gravity,
  Mirror
}
const HUD         // Score, Lives, Coins, Emeralds
const Store       // localStorage (Coins, Emeralds, Highscore, Skin)
const Controls    // Keyboard + Touch Input
const Renderer    // Canvas Draw-Loop
```

---

## Physik (Matter.js)

- **Matter.js:** Primär per CDN geladen, lokale `matter.min.js` als Fallback
- **Ball:** `Matter.Bodies.circle`, Restitution 0.7, Dichte 0.002
- **Flipper:** `Matter.Bodies.trapezoid` + `Matter.Constraint` als Drehachse
- **Bumper:** `Matter.Bodies.circle`, Restitution 1.5, isStatic true
- **Wände/Rampen:** `Matter.Bodies.rectangle` / `Matter.Bodies.fromVertices`, isStatic true
- **Collectibles:** Kleine Kreise, isSensor true (kein physischer Stoß, nur Kollisions-Event)

---

## Tisch-Generierung (prozedural)

Jeder Neustart generiert via `Table.generate(seed)` einen neuen Tisch:

**Fixes:**
- Linke + rechte Wand, Decke
- Abfluss unten-mitte (zwischen Flippern)
- Plunger-Spur rechts
- Linker + rechter Flipper

**Zufällig (innerhalb valider Bereiche):**
- 4–8 Bumper
- 2–4 Rampen/Schrägwände
- 1–3 Slingshots (Geisterstoßwände mit hoher Restitution)
- 1–3 rote Portale (Wand-Positionen)
- 1–2 grüne Portale (Wand-Positionen, nie direkt neben rot)
- 5–10 Münzen
- 1–2 Smaragde

Seed: `Date.now()` beim Spielstart — eindeutiger Tisch pro Runde.

---

## Portal-System

| Portal | Farbe | Platzierung | Funktion |
|--------|-------|-------------|----------|
| Blau | `#0088ff` | Spieler (Linksklick / Tap) | Teleport-Eingang |
| Grün | `#00ff88` | Fix im Level | Teleport-Ausgang |
| Rot | `#ff0033` | Fix im Level | Triggert zufälliges Mini-Game |

**Regeln:**
- Max. 1 blaues Portal aktiv — neues Setzen ersetzt das alte
- Blaues Portal nur auf Wänden/Bumpern platzierbar (Raycast vom Tap-Punkt zur nächsten Oberfläche)
- Ball trifft Blau → sofortige Teleportation zu Grün, gleiche Geschwindigkeit beibehalten
- Ball trifft Rot → `transitionTo(MINIGAME_*)` zufällig aus den drei Mini-Games

---

## Bumper & Multiplier

- Ball trifft Bumper → visueller Pulse-Effekt + Score-Event
- Score pro Bumper-Treffer: `100 × Multiplikator`
- Multiplikator-Stufen: 1× → 2× → 3× → 5× (bei je 3 aufeinanderfolgenden Treffern)
- Reset des Multiplikators wenn Ball in Abfluss fällt

---

## Collectibles

**Münzen (🪙 gelb, häufig):**
- Wert: 1 Münze
- `isSensor true` — Ball rollt drüber, Münze verschwindet
- Gespeichert in `localStorage.coins` (persistent über Sessions)
- Verwendung: Ball-Skins (späterer Shop)

**Smaragde (💎 cyan, selten):**
- Wert: 10 Münzen (direkt konvertiert) oder als `localStorage.emeralds` getrennt gespeichert
- Visuell: rotierender Glitzereffekt (Canvas `shadowBlur` + Rotation)

---

## Mini-Games

### Allgemein
- Einstieg: Ball trifft rotes Portal → Bildschirm-Flash → State-Wechsel
- Matter.js pausiert, Canvas-2D übernimmt
- Kein Leben-Verlust wenn Zeitlimit abläuft (nur kein Bonus)
- Rückkehr: Ball erscheint wieder am letzten grünen Portal-Ausgang

### Labyrinth (`MINIGAME_LABYRINTH`)
- Prozedural generiertes 2D-Maze (15×20 Zellen, Recursive-Backtracking-Algorithmus)
- Steuerung: Pfeiltasten (Desktop) / Swipe (Mobile)
- Ziel: Ausgang erreichen
- Zeitlimit: 30 Sekunden
- Belohnung: 3 Münzen + 500 Score-Bonus

### Gravity-Flip (`MINIGAME_GRAVITY`)
- Vertikaler Parcours, Schwerkraft flippt alle 3 Sekunden
- Steuerung: Space / Tap-Mitte zum manuellen Flip
- Ziel: 5 Checkpoints passieren
- Zeitlimit: 20 Sekunden
- Belohnung: 1 Smaragd + 800 Score-Bonus

### Mirror-Mode (`MINIGAME_MIRROR`)
- Mini-Pinball-Tisch gespiegelt (Links/Rechts vertauscht)
- Steuerung: A/D (Desktop, invertiert) / Touch-Seiten (Mobile, invertiert)
- Ziel: 3 Bumper treffen
- Zeitlimit: 25 Sekunden
- Belohnung: 5 Münzen + 2× Multiplikator für 30 Sekunden nach Rückkehr

---

## Controls

### Desktop
| Eingabe | Aktion |
|---------|--------|
| `A` | Linker Flipper |
| `D` | Rechter Flipper |
| `Space` | Ball launchen / Gravity-Flip |
| `Linksklick` | Blaues Portal platzieren |
| `Pfeiltasten` | Labyrinth-Navigation |

### Mobile (Touch)
| Eingabe | Aktion |
|---------|--------|
| Tap linke Hälfte | Linker Flipper |
| Tap rechte Hälfte | Rechter Flipper |
| Launch-Button (Mitte unten) | Ball launchen |
| Tap auf Spielfeld | Blaues Portal platzieren |
| Swipe | Labyrinth-Navigation |
| Tap Mitte | Gravity-Flip |

Sichtbare Buttons + Touch-Hälfte sind gleichzeitig aktiv (kombinierter Ansatz).

---

## HUD

```
┌─────────────────────────────────────────┐
│ SCORE: 12,400   ×3    ♥♥♥   🪙7   💎2  │
└─────────────────────────────────────────┘
```

- Score: laufend aktualisiert
- Multiplikator: blinkt bei Steigerung
- Leben: 3 Herzen (♥ = aktiv, ♡ = verloren)
- Münzen + Smaragde: Session-Zähler (Gesamtstand in localStorage)

---

## Score & Persistenz (localStorage)

| Key | Inhalt |
|-----|--------|
| `pb_highscore` | Höchste erreichte Punktzahl |
| `pb_coins` | Münzen-Gesamtstand |
| `pb_emeralds` | Smaragd-Gesamtstand |
| `pb_skin` | Gewählter Ball-Skin (Standard: `default`) |

---

## Ästhetik (Neon-Cyberpunk)

- **Hintergrund:** `#0a0a0f` + CSS-Grid-Linien-Animation
- **Primär:** Cyan `#00ffff`
- **Akzent:** Magenta `#ff00ff`
- **Warn:** Orange `#ff6600`
- **Portal Blau:** `#0088ff` mit `shadowBlur` Glow
- **Portal Grün:** `#00ff88`
- **Portal Rot:** `#ff0033`
- **Bumper:** pulsierende Neon-Ringe (`shadowBlur` + Canvas-Animation)
- **Schrift:** `Orbitron` (Google Fonts) für HUD, `monospace` Fallback
- **Canvas:** `shadowBlur` für alle leuchtenden Elemente

---

## Deployment

### GitHub Pages (automatisch)
```yaml
# .github/workflows/deploy.yml
# Trigger: Push auf main
# Action: Alle Dateien direkt auf gh-pages Branch deployen
```

### Capacitor-Readiness
- Matter.js CDN + lokaler Fallback → offline-fähig
- Kein Server-Side-Code
- Relative Pfade überall
- Touch-Events via Pointer Events API
- Später: `npx cap init` + `npx cap add ios/android` ohne Code-Änderungen

---

## Offene Punkte (Post-MVP)

- Ball-Skin Shop (Münzen/Smaragde ausgeben)
- Zusätzliche Mini-Game-Typen
- Sound-Effekte (Web Audio API)
- Level-Progression statt endlosem Einzeltisch
- Capacitor-Build Pipeline
