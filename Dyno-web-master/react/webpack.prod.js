let baseConfig = require('./webpack.config');
const merge = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
module.exports = merge(baseConfig,
    {
        plugins: [
            new UglifyJSPlugin({ parallel: true }),
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify('production'),
            }),
        ],
    });
