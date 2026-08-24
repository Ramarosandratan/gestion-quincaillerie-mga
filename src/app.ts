import cors from 'cors';
import express from 'express';

import { errorHandler } from './middlewares/error.middleware';
import { apiRouter } from './routes';

export const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);
app.use(errorHandler);