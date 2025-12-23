const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: {
        main: './src/main/index.ts',
        preload: './src/main/preload.ts',
    },
    target: 'electron-main',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true,
                        compilerOptions: {
                            noEmit: false,
                        }
                    }
                },
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [],
    devtool: 'source-map',
    externals: {
        'electron': 'commonjs2 electron',
    },
    node: {
        __dirname: false,
        __filename: false,
    },
    stats: {
        errorDetails: true,
    },
};