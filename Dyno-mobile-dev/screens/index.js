import { Guild } from './Guild';
import { Guilds } from './Guilds';
import { Home } from './Home';
import { RightDrawer } from './drawers/Right';
import { Navbar } from './Navbar';

import { Navigation } from 'react-native-navigation';

export function registerScreens() {
    Navigation.registerComponent('dyno.Home', () => Home);
    Navigation.registerComponent('dyno.Guild', () => Guild);
    Navigation.registerComponent('dyno.Guilds', () => Guilds);
    Navigation.registerComponent('dyno.RightDrawer', () => RightDrawer);
    Navigation.registerComponent('dyno.Navbar', () => Navbar);
};
