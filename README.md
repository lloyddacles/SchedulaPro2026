# Faculty Teaching Load Scheduling System

A full-stack web application designed for academic coordinators to seamlessly manage teaching structures, assign loads, and create conflict-free schedules visually.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, React Query, React Router DOM, Axios, Lucide Icons
- Backend: Node.js, Express, MySQL (mysql2 promise wrapper), bcrypt, jsonwebtoken

## Features
- **Auth**: Protected admin routes using JWT.
- **Dependencies**: Real-time queries linked through React Query.
- **Teaching Load Management**: Validation that blocks loads exceeding the max teaching hours a faculty is allocated.
- **Schedule Builder**: A visual weekly calendar layout that strictly enforces overlap collision checks on adding classes.
- **Exports**: Built-in CSV export for loads and printable schedule views.

## Setup Instructions
Please refer to the `walkthrough.md` generated in your task directory or simply run:
1. `cd backend && npm install && npm run seed && npm run dev`
2. `cd frontend && npm install && npm run dev`

## GitHub to Vercel Deployment Schema
1. Deploy via Git: `git add .` -> `git push origin main`.
2. Connect the Vercel Dashboard to your new GitHub Repository.
3. Keep Framework Preset as `Other` - Vercel will inherently read `vercel.json` routing both physical Static React Builds and native Serverless Express Functions dynamically!
