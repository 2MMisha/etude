# ETUDE — Election day story series (Remotion)

Series «Сегодня все выбирают… а мы свой выбор сделали давно» · Knesset election day, 27.10.2026.
Vertical 1080×1920, 30 fps, H.264.

## Commands

```bash
npm install
npm run studio          # preview / tweak in Remotion Studio
npm run render          # → out/story-01.mp4
npm run render:notext   # → out/story-01-notext.mp4 (no headlines, logos stay)
npm run stills          # → out/stills/story-01-f030|f100|f180.png
```

Add `--props='{"showText":true,"showSafeZone":true}'` to any render/still to see the story UI bands
(top 250 px, bottom 300 px) where no text may go.

## Structure

```
public/brand/logo-white.svg      white wordmark from the site repo (public/brand/logos)
public/fonts/                    Gveret Levin, Caveat, Heebo, Montserrat — local TTF, SIL OFL
src/brand/tokens.ts              brand colors (brandbook), fonts, video size, safe zone
src/brand/fonts.ts               loads the local fonts before rendering
src/components/                  reusable scene parts: StudioBackground, BallotBox, DancerHand,
                                 Envelope, Sparkles, BrandWatermark, StoryText (HebrewHeadline,
                                 RussianLine, BreathingEllipsis, BrushStroke), SafeZoneGuides
src/series/StoryShell.tsx        common frame: background + scene + text (safe area) + overlay + watermark
src/series/copy.ts               all headlines of the series
src/series/index.ts              list of stories → Root registers each one + its "-NoText" twin
src/stories/Story01.tsx          story 1: timeline + choreography
```

## Adding stories 2–4

1. Add the copy to `src/series/copy.ts` (`story02: {he: '…', ru: '…'}`).
2. Create `src/stories/Story02.tsx` — copy `Story01.tsx`, keep `<StoryShell>`, change the scene/timeline.
3. Append `{id: 'Story02', component: Story02, durationInFrames: 210}` to `src/series/index.ts`.
4. Render: `npx remotion render Story02 out/story-02.mp4` and `npx remotion render Story02-NoText out/story-02-notext.mp4`.

## Rules kept

- Strictly neutral: no parties, party colors, ballot letters, flags or politicians; the envelope is empty.
- Hebrew is wrapped in `dir="rtl"` elements; the ellipsis sits at the logical end, i.e. visually on the left.
- Logo is the supplied file, no effects (brandbook "Don'ts"). Brush faces only for headlines, Gveret Levin at line-height 1.25.
