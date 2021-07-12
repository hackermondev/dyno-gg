import { Navigation } from 'react-native-navigation';
import { Platform } from 'react-native';
import { registerScreens } from './screens';
import { AndroidApp, IOSApp } from './apps';
import { Navbar } from './navbar';

registerScreens();

 
if (Platform.OS === 'android') {

    // AndroidApp.screen.navigatorStyle = Navbar;

    // start the app
    let app = Navigation.startSingleScreenApp(AndroidApp);
} else if (Platform.OS === 'ios') {

    // IOSApp.screen.navigatorStyle = Navbar;

    // start the app
    let app = Navigation.startSingleScreenApp(IOSApp);
}
