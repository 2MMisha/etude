# ETUDE — Election day story series (Remotion)

Series «Сегодня все выбирают… а мы свой выбор сделали давно» · Knesset election day, 27.10.2026.
Four vertical stories, 1080×1920, 30 fps, 7 s each, H.264 with music and sound effects.

| # | Hebrew | Russian | Scene |
|---|--------|---------|-------|
| 01 | היום כולם בוחרים… | Сегодня все выбирают… | a hand drops an empty envelope into the ETUDE box |
| 02 | …ואנחנו בחרנו מזמן | …а мы свой выбор сделали давно | the box glows, ballroom shoes rise out of it |
| 03 | בחרנו בריקוד | Мы выбрали танец | the shoes waltz on the parquet, leaving footprints |
| 04 | בואו לרקוד איתנו | Танцуйте с нами | logo, free trial class, address, WhatsApp |

`SeriesFull` = all four back to back (28 s) with the waltz playing straight through.

## Commands

```bash
npm install
npm run audio        # regenerate public/audio/*.wav (python3 + numpy)
npm run studio       # preview / tweak in Remotion Studio
npm run render:all   # every story ± text, SeriesFull ± text, stills 30/100/180 → out/
```

Add `--props='{"showText":true,"showSafeZone":true,"withMusic":true}'` to a render/still to see the story UI bands
(top 250 px, bottom 300 px) where no text may go.

## Audio

`audio-src/generate_audio.py` synthesises everything (numpy only, no samples):

- `music-waltz.wav` — 28 s slow waltz in D major, 3/4, exactly 12 beats per story. Story N plays its own 4-bar slice,
  so posting the stories in a row sounds like one piece. Story 1 ends on the dominant (the "…"), story 4 resolves.
- SFX: whoosh in/out (hand), paper slide (envelope), box thump, sparkle chimes, text plucks, magic rise + swell
  (story 2), heel taps on every waltz beat (story 3), bell chord (logo).

Placement is in each story file (`<Sfx name=… at={frame} />`, `<SeriesMusic storyIndex=… />`).

## Structure

```
audio-src/generate_audio.py      music + SFX generator
public/audio/                    generated WAVs
public/brand/                    white logos from the site repo (public/brand/logos)
public/fonts/                    Gveret Levin, Caveat, Heebo, Montserrat — local TTF, SIL OFL
src/brand/                       brand tokens (brandbook colours, fonts, safe zone), font loading
src/components/                  StudioBackground, BallotBox, DancerHand, Envelope, BallroomShoes,
                                 DancingPair, Sparkles, StoryText, StoryAudio, BrandWatermark, SafeZoneGuides
src/series/StoryShell.tsx        common frame: background + scene + text (safe area) + overlay + watermark + audio
src/series/copy.ts               all copy (contacts mirror the site's src/data/site-settings.json)
src/series/index.ts              list of stories → Root registers each one, its "-NoText" twin, and SeriesFull
src/stories/Story01..04.tsx      timelines + choreography
```

## Adding a story

1. Copy to `src/series/copy.ts`.
2. `src/stories/Story05.tsx` — wrap the scene in `<StoryShell storyIndex={4} …>`.
3. Append it to `src/series/index.ts`. (For continuous music, extend the progression in the generator by 4 bars.)

## Rules kept

- Strictly neutral: no parties, party colours, ballot letters, flags or politicians; the envelope is empty.
- ETUDE teaches ballroom & Latin, so the props are a standard shoe and a Latin sandal, the music is a waltz.
- Hebrew is in `dir="rtl"` elements; ellipses follow logical order (end → visual left, start → visual right).
- Logos are the supplied files with no effects. Numbers and contacts are set in Heebo / Montserrat.
