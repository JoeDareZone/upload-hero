import React from 'react'
import { Text, View } from 'react-native'

interface ErrorDisplayProps {
	errors: string[]
}

export const ErrorDisplay = ({ errors }: ErrorDisplayProps) => {
	if (errors.length === 0) return null

	return (
		<View className='bg-yellow-400 p-3 rounded-xl mb-6 w-full shadow-sm'>
			{errors.map((error, idx) => (
				<Text
					key={idx}
					className='text-yellow-800 font-semibold text-base'
				>
					{error}
				</Text>
			))}
		</View>
	)
}
