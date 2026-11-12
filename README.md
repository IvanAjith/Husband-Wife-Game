# Husband vs Wife: Don't Get Caught 📱

A tiny browser game. It's 10 PM, you're in bed, your wife is asleep… and your phone is calling.

## Scenarios
1. **The Midnight Scroll**: sneak your phone in bed while your wife sleeps.
2. **Shh… The Baby**: Dharma and his wife whisper in bed while their baby sleeps between them. If the baby sees them talking, she wails and both say "Oh sh*t!".

## How to play
Open `index.html` in a browser. No install or build step. Pick a scenario from the menu.

- **Hold the left mouse button** (or **Space**, or touch) to use your phone and fill the *Phone Time* bar.
- **Release** to hide the phone.
- When your wife starts to stir (*"mmm…"*), release the button before she opens her eyes. If she sees the phone, she's heartbroken.
- Fill the bar and you put the phone away, she snuggles up, and you both fall asleep happily.
- 3 levels, each harder than the last. Press **M** to mute.

## Project layout
```
index.html        page + overlay UI
style.css
js/audio.js       synthesised sounds (Web Audio, no audio files)
js/draw.js        shared canvas helpers (faces, bubbles, HUD)
js/bedroom.js     scenario 1: game logic + canvas art
js/nursery.js     scenario 2: game logic + canvas art
js/main.js        screens, input, game loop
```

## Adding a scenario
A scenario is an object pushed onto `Game.scenarios` with `title`, `intro`, `levels[]`,
`reset(level)`, `update(dt, holding)`, `draw(ctx, t)`, and the fields `result`
(`'won' | 'lost' | null`), `endT` and `progress`. Add a new file in `js/`, include it in `index.html`, and it appears in the menu. See `js/nursery.js` for an example.
