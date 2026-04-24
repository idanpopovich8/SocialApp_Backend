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
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';

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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(errorHandler);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Backend!');
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

app.set('io', io);

setupSocketHandlers(io);

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Socket.io is ready for real-time connections`);
  });
}

export { app, server, io };
