# Husband vs Wife: Don't Get Caught 📱

A tiny browser game. It's 10 PM, you're in bed, your wife is asleep… and your phone is calling.

## How to play
Open `index.html` in a browser. No install or build step.

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
js/bedroom.js     scenario 1: game logic + canvas art
js/main.js        screens, input, game loop
```

## Adding a scenario
A scenario is an object pushed onto `Game.scenarios` with `title`, `intro`, `levels[]`,
`reset(level)`, `update(dt, holding)`, `draw(ctx, t)`, and the fields `result`
(`'won' | 'lost' | null`), `endT` and `progress`. See `js/bedroom.js` for a full example.
