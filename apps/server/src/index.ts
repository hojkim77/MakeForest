import { app } from './app';
import { registerCronJobs } from './cron/midnight';

const PORT = process.env.PORT ?? 4000;

registerCronJobs();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
