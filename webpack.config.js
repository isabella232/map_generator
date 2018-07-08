const path = require('path');

const SRC_ROOT = path.resolve(__dirname, 'src');
const DESTINATION = path.resolve(__dirname, 'dist');

module.exports = {
    context: SRC_ROOT,
    entry: {
        'main': './ui/Main.ts'
    },
    output: {
        filename: '[name].bundle.js',
        path: DESTINATION
    },
    resolve: {
        extensions: ['.ts', '.js'],
        modules: ['node_modules']
    },
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js$/,
                use: 'source-map-loader'
            },
            {
                enforce: 'pre',
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'tslint-loader'
            },
            {
                test: /\.ts$/,
                exclude: [/node_modules/],
                use: 'awesome-typescript-loader'
            }
        ]
    },
    devtool: 'cheap-module-source-map',
    devServer: {
        contentBase: SRC_ROOT,
        port: 9000,
        open: true
    }
};

