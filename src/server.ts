import { app } from './app';
import { config } from './config/env';

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});