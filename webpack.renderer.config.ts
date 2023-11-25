import type { Configuration } from 'webpack';

import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import { plugins } from './webpack.plugins';
import { rules } from './webpack.rules';

rules.push({
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

export const rendererConfig: Configuration = {
    module: {
        rules,
    },
    plugins,
    resolve: {
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
        plugins: [
            new TsconfigPathsPlugin({
                configFile: `tsconfig.json`,
                logInfoToStdOut: true,
            }),
        ],
    },
};
