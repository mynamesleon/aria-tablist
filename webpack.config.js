module.exports = {
    mode: 'production',
    entry: './src/aria-tablist.js',
    module: {
        rules: [
            {
                test: /\.(js)$/,
                use: ['babel-loader'],
                exclude: /node_modules/
            }
        ]
    },
    output: {
        libraryTarget: 'umd',
        path: __dirname + '/dist',
        filename: 'aria-tablist.min.js'
    }
};
