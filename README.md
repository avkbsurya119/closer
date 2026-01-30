# Closer

A modern real-time chat application built with the MERN stack and Socket.io.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socketdotio&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## Features

- **Real-time Messaging** - Instant message delivery using Socket.io
- **User Authentication** - Secure signup/login with JWT tokens
- **Online Status** - See who's online in real-time
- **Image Sharing** - Share images in conversations via Cloudinary
- **Profile Pictures** - Upload and update your profile picture
- **Welcome Emails** - Automated welcome email on signup via Resend
- **Sound Effects** - Keyboard and notification sounds (toggleable)
- **Rate Limiting** - API protection with Arcjet
- **Responsive Design** - Works on desktop and mobile

## Tech Stack

### Frontend
- React 19
- Vite
- Zustand (State Management)
- Socket.io Client
- Tailwind CSS + DaisyUI
- React Router
- Axios

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- JWT Authentication
- bcrypt (Password Hashing)
- Cloudinary (Image Storage)
- Resend (Email Service)
- Arcjet (Security)

## Project Structure

```
Closer/
├── backend/
│   └── src/
│       ├── controllers/     # Request handlers
│       ├── routes/          # API endpoints
│       ├── models/          # MongoDB schemas
│       ├── middleware/      # Auth & security
│       ├── lib/             # Utilities & configs
│       ├── emails/          # Email templates
│       └── server.js        # Entry point
│
├── frontend/
│   └── src/
│       ├── pages/           # Login, Signup, Chat
│       ├── components/      # Reusable UI components
│       ├── store/           # Zustand stores
│       ├── lib/             # Axios config
│       └── hooks/           # Custom hooks
│
└── package.json             # Monorepo scripts
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- MongoDB Atlas account
- Cloudinary account
- Resend account
- Arcjet account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/avkbsurya119/closer.git
   cd closer
   ```

2. **Install dependencies**
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```

3. **Configure environment variables**

   Create `backend/.env`:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret

   RESEND_API_KEY=your_resend_api_key
   EMAIL_FROM=onboarding@resend.dev
   EMAIL_FROM_NAME=Closer Support

   CLIENT_URL=http://localhost:5173

   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   ARCJET_KEY=your_arcjet_key
   ARCJET_ENV=development
   ```

4. **Start development servers**

   Backend:
   ```bash
   npm run dev --prefix backend
   ```

   Frontend:
   ```bash
   npm run dev --prefix frontend
   ```

5. **Open the app**

   Visit `http://localhost:5173`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| PUT | `/api/auth/update-profile` | Update profile picture |
| GET | `/api/auth/check` | Check auth status |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/contacts` | Get all users |
| GET | `/api/messages/chats` | Get chat partners |
| GET | `/api/messages/:id` | Get messages with user |
| POST | `/api/messages/send/:id` | Send message |

## Deployment

The app is configured for deployment on Render.

1. Connect your GitHub repository to Render
2. Set the build command: `npm run build`
3. Set the start command: `npm run start`
4. Add all environment variables from `.env`

**Live Demo:** [https://closer-slbn.onrender.com](https://closer-slbn.onrender.com)

## License

This project is open source and available under the [MIT License](LICENSE).
