import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');

// Optional: point Remotion at an already-installed Chrome Headless Shell
// instead of letting it download one (e.g. REMOTION_BROWSER=/path/to/chrome-headless-shell).
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
