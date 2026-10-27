#!/usr/bin/env bash
# Renders every story (with and without text), the combined series video and review stills.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/stills
for n in 01 02 03 04; do
  npx remotion render "Story$n" "out/story-$n.mp4" --codec=h264
  npx remotion render "Story$n-NoText" "out/story-$n-notext.mp4" --codec=h264
  for f in 030 100 180; do
    npx remotion still "Story$n" "out/stills/story-$n-f$f.png" --frame=$((10#$f))
  done
done
npx remotion render SeriesFull out/story-series-full.mp4 --codec=h264
npx remotion render SeriesFull-NoText out/story-series-full-notext.mp4 --codec=h264
echo RENDER-ALL-DONE
