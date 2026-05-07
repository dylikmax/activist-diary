import { config } from "dotenv";
import cors from 'cors';
import path from "path";

config({ path: path.resolve(__dirname, "..", ".env") });

import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./modules/auth";
import { departmentRouter } from "./modules/departments";
import { taskRouter } from "./modules/tasks";
import { attachmentRouter } from "./modules/attachments";
import { commentRouter } from "./modules/comments";
import { errorHandler } from "./shared/middlewares/error-handler.middleware";
import { env } from "./config/env";
import { testConnection } from "./database/connection";
import { userRouter } from "./modules/users";

const app = express();

app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  exposedHeaders: [],
  maxAge: 86400
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Маршруты
app.use("/api/auth", authRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/attachments", attachmentRouter);
app.use("/api/comments", commentRouter);
app.use('/api/users', userRouter);

app.use(errorHandler);

async function bootstrap() {
  await testConnection();
  app.listen(env.PORT, () =>
    console.log(`🚀 Server running on port ${env.PORT}`),
  );
}

bootstrap().catch(console.error);
