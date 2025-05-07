/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js}',
  ],
  safelist: [
    'bg-blue-500', 'hover:bg-blue-600', 'bg-green-500', 'hover:bg-green-600',
    'bg-yellow-500', 'hover:bg-yellow-600', 'bg-gray-500', 'hover:bg-gray-600',
    'bg-purple-500', 'hover:bg-purple-600', 'bg-orange-500', 'hover:bg-orange-600',
    'text-white', 'py-3', 'px-6', 'rounded-lg', 'text-center', 'w-48',
    'space-y-4', 'text-gray-700', 'border-gray-300', 'rounded-lg', 'p-3',
    'shadow-sm', 'focus:ring-2', 'focus:ring-blue-500', 'text-red-600',
    'bg-gray-200', 'border', 'border-gray-300', 'p-2', 'text-center',
    'mt-4', 'text-sm', 'text-gray-600', 'grid', 'grid-cols-3', 'gap-4',
    'text-lg', 'font-semibold', 'drop-shadow-md', 'mb-4', 'max-w-xs',
    'shadow-lg', 'rounded-lg', 'flex', 'flex-col', 'items-center', 'justify-center'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};