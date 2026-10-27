import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Local font files (downloaded from github.com/google/fonts, all SIL OFL).
// loadFont() blocks rendering until each face is ready.
export const fontsReady = Promise.all([
  loadFont({family: 'Gveret Levin', url: staticFile('fonts/GveretLevin-Regular.ttf'), weight: '400'}),
  loadFont({family: 'Caveat', url: staticFile('fonts/Caveat-Variable.ttf'), weight: '400 700'}),
  loadFont({family: 'Heebo', url: staticFile('fonts/Heebo-Variable.ttf'), weight: '100 900'}),
  loadFont({family: 'Montserrat', url: staticFile('fonts/Montserrat-Variable.ttf'), weight: '100 900'}),
]);
