# Inventory Manager

An Electron-based desktop app for inventory management, integrated with Supabase for authentication and data syncing, and SQLite for offline queuing. It supports inventory transfers, staging requests, transaction updates, and reports, with a user-friendly dashboard and Curaleaf branding.

## Features
- Supabase-based authentication with nickname support
- Forms for Transfer In/Out, Staging Request, Transaction Updates, Inventory Display, Staging Updates, Product Master, and Reports
- Offline queuing with SQLite and periodic syncing (every 5 minutes)
- Tailwind CSS and Flatpickr for a polished UI
- Cross-platform support (Windows, macOS, Linux)

## Prerequisites
- Node.js and npm
- Supabase account with `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables
- Electron for desktop app development

## Setup
1. Clone the repository: `git clone [your-repo-url]`
2. Navigate to the project directory: `cd inventory-manager`
3. Install dependencies: `npm install`
4. Create a `.env` file with Supabase credentials
5. Start the app: `npm run start`
6. Build for distribution: `npm run build`

## Notes
- Curaleaf branding is used with permission.
- Ensure `.env` is not committed (excluded via `.gitignore`).
- The app supports offline operations with automatic syncing when online.
