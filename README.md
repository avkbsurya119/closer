# Closer

A modern, secure real-time chat application built with the MERN stack, featuring end-to-end encryption, multi-factor authentication, and group chat capabilities.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socketdotio&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## Features

### Core Features
- **Real-time Messaging** - Instant message delivery using Socket.io
- **Group Chat** - Create groups, add members, manage roles (Creator/Admin/Member)
- **Image Sharing** - Share images in conversations via Cloudinary
- **Online Status** - See who's online in real-time
- **Profile Pictures** - Upload and update your profile picture
- **Welcome Emails** - Automated welcome email on signup via Resend
- **Sound Effects** - Keyboard and notification sounds (toggleable)
- **Responsive Design** - Works on desktop and mobile

### Security Features (Cyber Security Lab - 23CSE313)

| Category | Implementation | Technology |
|----------|---------------|------------|
| **Authentication** | Single-factor (Password) + Multi-factor (SMS OTP) | bcrypt, Twilio |
| **Authorization** | Role-based Access Control (ACL) | Creator/Admin/Member roles |
| **Encryption** | End-to-End Encryption (Hybrid) | RSA-2048 + AES-256-GCM |
| **Hashing & Signature** | Password hashing + Digital signatures | bcrypt (salt), SHA-256 |
| **Encoding** | Binary to text conversion | Base64 |

## Security Implementation Details

### 1. Authentication

**Single-Factor Authentication:**
- Email + Password login
- Passwords hashed using **bcrypt** with 10 salt rounds
- Never stores plain text passwords

**Multi-Factor Authentication (MFA):**
- After password verification, 6-digit OTP sent via **Twilio SMS**
- OTP expires in 5 minutes
- Required for both signup and login

### 2. Authorization (Access Control List)

**3 Subjects (Roles):**
| Role | Group Settings | Members | Messages |
|------|---------------|---------|----------|
| **Creator** | Read, Update, Delete | Add, Remove, Promote, Demote | Send, Delete Any |
| **Admin** | Read | Add, Remove, Promote, Demote | Send, Delete Any |
| **Member** | Read | View | Send, Delete Own |

### 3. End-to-End Encryption (E2E)

**Hybrid Encryption Approach:**
```
Sender:
  1. Generate random AES-256 key
  2. Encrypt message with AES-GCM
  3. Encrypt AES key with recipient's RSA public key
  4. Send encrypted message + encrypted key + IV

Receiver:
  1. Decrypt AES key with private RSA key
  2. Decrypt message with AES key
  3. Display plaintext
```

- **Key Exchange:** RSA-OAEP 2048-bit (Web Crypto API)
- **Message Encryption:** AES-256-GCM
- **Group Messages:** AES key encrypted separately for each member

### 4. Digital Signatures

- **SHA-256** hash computed before sending
- Receiver verifies hash after decryption
- UI shows verification status (green shield = verified, red = tampered)

### 5. Encoding

- **Base64** encoding for all binary data (encrypted content, keys, IV, signatures)
- Uses `btoa()` for encoding, `atob()` for decoding

## Tech Stack

### Frontend
- React 19 + Vite
- Zustand (State Management)
- Socket.io Client
- Web Crypto API (E2E Encryption)
- Tailwind CSS + DaisyUI
- React Router
- Lucide Icons

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- JWT Authentication
- bcrypt (Password Hashing)
- Twilio (SMS OTP)
- Cloudinary (Image Storage)
- Resend (Email Service)
- Arcjet (Rate Limiting)

## Project Structure

```
Closer/
├── backend/
│   └── src/
│       ├── controllers/     # Request handlers
│       │   ├── auth.controller.js
│       │   ├── message.controller.js
│       │   └── group.controller.js
│       ├── routes/          # API endpoints
│       ├── models/          # MongoDB schemas
│       │   ├── User.js      # publicKey, privateKey fields
│       │   ├── Message.js   # E2E encryption fields
│       │   ├── Group.js     # Members with roles
│       │   └── GroupMessage.js
│       ├── middleware/      # Auth & group permissions
│       ├── lib/
│       │   ├── sms.js       # Twilio OTP
│       │   └── socket.js    # Real-time events
│       └── server.js
│
├── frontend/
│   └── src/
│       ├── pages/           # Login, Signup, Home, Settings
│       ├── components/
│       │   ├── ChatContainer.jsx    # 1-on-1 chat with E2E
│       │   └── groups/              # Group chat components
│       ├── store/
│       │   ├── useAuthStore.js      # Auth + key management
│       │   ├── useChatStore.js      # Messages + encryption
│       │   └── useGroupStore.js     # Groups + group encryption
│       └── lib/
│           └── crypto.js    # E2E encryption functions
│
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- MongoDB Atlas account
- Twilio account (for SMS OTP)
- Cloudinary account
- Resend account

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

   # Twilio (MFA)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+1234567890

   # Email
   RESEND_API_KEY=your_resend_api_key
   EMAIL_FROM=onboarding@resend.dev
   EMAIL_FROM_NAME=Closer Support

   CLIENT_URL=http://localhost:5173

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Security
   ARCJET_KEY=your_arcjet_key
   ARCJET_ENV=development
   ```

4. **Start development servers**
   ```bash
   # Backend
   npm run dev --prefix backend

   # Frontend (new terminal)
   npm run dev --prefix frontend
   ```

5. **Open the app** at `http://localhost:5173`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register (sends OTP) |
| POST | `/api/auth/verify-signup-otp` | Verify signup OTP |
| POST | `/api/auth/login` | Login (sends OTP) |
| POST | `/api/auth/verify-login-otp` | Verify login OTP |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/check` | Check auth status |
| PUT | `/api/auth/update-profile` | Update profile picture |
| POST | `/api/auth/public-key` | Store user's public key |
| GET | `/api/auth/public-key/:userId` | Get user's public key |

### Messages (1-on-1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/contacts` | Get all users |
| GET | `/api/messages/chats` | Get chat partners |
| GET | `/api/messages/:id` | Get messages with user |
| POST | `/api/messages/send/:id` | Send encrypted message |
| DELETE | `/api/messages/:id` | Delete message |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | Get my groups |
| GET | `/api/groups/:groupId` | Get group details |
| PUT | `/api/groups/:groupId` | Update group (creator only) |
| DELETE | `/api/groups/:groupId` | Delete group (creator only) |
| POST | `/api/groups/:groupId/members` | Add members |
| DELETE | `/api/groups/:groupId/members/:userId` | Remove member |
| PUT | `/api/groups/:groupId/members/:userId/role` | Change role |
| POST | `/api/groups/:groupId/leave` | Leave group |
| GET | `/api/groups/:groupId/messages` | Get group messages |
| POST | `/api/groups/:groupId/messages` | Send group message |
| DELETE | `/api/groups/:groupId/messages/:messageId` | Delete message |

## Security Threat Mitigations

| Attack | Mitigation |
|--------|------------|
| Brute Force | bcrypt (slow hashing) + MFA |
| Rainbow Table | Random salt per password |
| Man-in-the-Middle | E2E encryption + HTTPS |
| Message Tampering | SHA-256 digital signatures |
| Session Hijacking | HttpOnly + Secure cookies |
| Privilege Escalation | Server-side role verification |
| XSS | React auto-escaping |
| Injection | Mongoose ODM + validation |

## Deployment

Deployed on **Render**:

1. Connect GitHub repository
2. Build command: `npm run build`
3. Start command: `npm run start`
4. Add environment variables

**Live Demo:** [https://closer-slbn.onrender.com](https://closer-slbn.onrender.com)

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Developed for Cyber Security Lab Evaluation (23CSE313)**
