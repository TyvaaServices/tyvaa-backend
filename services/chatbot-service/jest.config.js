module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!**/node_modules/**',
    ],
    coverageReporters: ['text', 'lcov'],
    setupFiles: ['./tests/setup.js']
};
