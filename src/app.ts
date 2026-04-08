import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import connectDB from './db';
import userRoutes from './routes/user_routes';
import postRoutes from './routes/post_routes';
import commentRoutes from './routes/comment_routes';
import conversationRoutes from './routes/conversation_routes';
import messageRoutes from './routes/message_routes';
import { errorHandler } from './middleware/error_handler';
import { setupSocketHandlers } from './socket/socket_handlers';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use('/public', express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Connect to Database
connectDB();

app.use((req, res, next) => {
  console.log(`Incoming Request: [${req.method}] ${req.originalUrl}`);
  next();
});
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});
app.use('/api/auth', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use(errorHandler);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Backend!');
});

// 🟢 Create HTTP server for Socket.io compatibility
const server = http.createServer(app);

// 🟢 Initialize Socket.io with CORS configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// 🟢 Make io globally accessible to controllers and routes
app.set('io', io);

// 🟢 Setup all Socket.io event handlers
setupSocketHandlers(io);

// 🟢 Start server using HTTP server instead of app.listen()
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`Socket.io is ready for real-time connections`);
});

// 🟢 Export io for use in socket handlers
export { io };
