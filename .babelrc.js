module.exports = {
    presets: [['@babel/preset-env']],
    plugins: [
        // improve IE compatibility
        ['@babel/plugin-transform-modules-commonjs', { loose: true }],
        '@babel/plugin-transform-member-expression-literals',
        '@babel/plugin-transform-property-literals'
    ]
};
