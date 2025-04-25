module.exports = {
	preset: 'jest-expo',
	transformIgnorePatterns: [
		'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
	],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
	collectCoverage: true,
	collectCoverageFrom: [
		'**/*.{js,jsx,ts,tsx}',
		'!**/coverage/**',
		'!**/node_modules/**',
		'!**/babel.config.js',
		'!**/jest.config.js',
		'!**/jest.setup.js',
		'!**/metro.config.js',
		'!**/tailwind.config.js',
		'!**/.expo/**',
		'!**/android/**',
		'!**/ios/**',
		'!**/assets/**',
		'!**/*.d.ts',
		'!**/backend/**',
	],
	coverageThreshold: {
		global: {
			branches: 15,
			functions: 10,
			lines: 10,
			statements: 10,
		},
	},
	setupFilesAfterEnv: ['./jest.setup.js'],
	testEnvironment: 'jsdom',
}
