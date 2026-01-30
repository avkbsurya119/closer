import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Group from "../models/Group.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// we will use this function to check if the user is online or not
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Helper function to get group room name
export function getGroupRoomName(groupId) {
  return `group:${groupId}`;
}

// this is for storig online users
const userSocketMap = {}; // {userId:socketId}

io.on("connection", async (socket) => {
  console.log("A user connected", socket.user.fullName);

  const userId = socket.userId;
  userSocketMap[userId] = socket.id;

  // Join all group rooms the user is a member of
  try {
    const userGroups = await Group.find({ "members.user": userId }).select("_id");
    userGroups.forEach((group) => {
      socket.join(getGroupRoomName(group._id));
    });
  } catch (error) {
    console.log("Error joining group rooms:", error);
  }

  // Listen for joining a new group room (when user is added to a group)
  socket.on("joinGroup", (groupId) => {
    socket.join(getGroupRoomName(groupId));
  });

  // Listen for leaving a group room
  socket.on("leaveGroup", (groupId) => {
    socket.leave(getGroupRoomName(groupId));
  });

  // io.emit() is used to send events to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // with socket.on we listen for events from clients
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.user.fullName);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
