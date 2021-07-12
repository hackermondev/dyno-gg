let path = require('path');
let baseConfig = {
    entry: {
        serverListing: './serverListing/index.jsx',
        serverPage: './serverListing/serverPage/index.jsx',
        serverPageInvite: './serverListing/serverPage/invite/index.jsx',
        dashboard: './dashboard/index.jsx',
        account: './account/index.jsx',
        status: './status/index.jsx',
    },
    output: {
        path: path.join(__dirname, '../public/js/react'),
        filename: '[name].js',
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.css$/,
                loader: 'style-loader',
            },
            {
                test: /\.css$/,
                loader: 'css-loader',
                query: {
                    modules: true,
                    localIdentName: '[name]__[local]___[hash:base64:5]',
                },
            },
            {
                test: /\.jsx?$/, exclude: /node_modules/, loader: 'babel-loader',
                query: {
                    presets: ['react'],
                    plugins: ['transform-class-properties'],
                },
            },
        ],
    },
};
module.exports = baseConfig;
