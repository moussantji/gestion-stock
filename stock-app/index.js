import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent appelle AppRegistry.registerComponent('main', () => App)
// et garantit un environnement correct aussi bien dans Expo Go que dans un build natif.
registerRootComponent(App);
