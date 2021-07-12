template = {
    background: 'grey',
    name: 'test',
    height: 250,
    width: 500,
    objects: [
            {
                x: 0,
                y: 0,
                height: 250,
                width: 500,
                //url: 'https://cdn.discordapp.com/attachments/325066606923481088/401453996792872970/profilebackground.png',
                url: 'https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-511496.png',
                type: I.ObjectType.FetchImage,
            },
            {
                x: 40 + (160 / 2),
                y: 30 + (160 / 2),
                radius: 164 / 2,
                startAngle: 0,
                endAngle: Math.PI * 2,
                style: 'white',
                type: I.ObjectType.Arc,
                stroke: true,
                lineWidth: 4,
            },
            {
                x: 40,
                y: 30,
                width: 160,
                height: 160,
                url: 'https://cdn.discordapp.com/avatars/227115752396685313/a_239584463b5fd0ef3b53cf8f73ab8cda.gif?size=256',
                type: I.ObjectType.FetchImage,
                crop: {
                    x: 40 + (160 / 2),
                    y: 30 + (160 / 2),
                    radius: 160 / 2,
                    startAngle: 0,
                    endAngle: Math.PI * 2,
                }
            },
            {
                x: 500 / 2,
                y: 0 + 10,
                lineWidth: 3,
                pathPoints: [
                    {
                        x: 500 / 2,
                        y: 250 - 10,
                    },
                ],
                style: '#337fd5',
                stroke: true,
                type: I.ObjectType.Line,
            },
            {
                x: 125,
                y: 230,
                maxWidth: 250,
                text: 'Gin#0001',
                style: 'white',
                font: '18px Helvetica',
                textAlign: 'center',
                type: I.ObjectType.Text,
            }
    ]
}
