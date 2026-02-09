import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import connectDB from './db';
import userRoutes from './routes/user_routes';
import postRoutes from './routes/post_routes';
import { errorHandler } from './middleware/error_handler';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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

app.use(errorHandler);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Backend!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
