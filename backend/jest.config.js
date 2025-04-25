module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
	collectCoverage: true,
	coverageReporters: ['json', 'lcov', 'text', 'clover'],
	coverageDirectory: 'coverage',
	coverageThreshold: {
		global: {
			branches: 85,
			functions: 85,
			lines: 85,
			statements: 85,
		},
	},
}
