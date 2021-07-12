export let AndroidApp = {
    screen: {
        screen: 'dyno.Home',
        title: 'Home',
        navigatorButtons: {
            rightButtons: [{
                id: 'sideMenu'
            }]
        }
    },
    drawer: {
        right: {
            screen: 'dyno.RightDrawer',
            fixedWidth: 500
        }
    }, 
};