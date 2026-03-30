import { app } from './index';

const DEFAULT_PORT = 3000;

const portValue = process.env.PORT?.trim();
const parsedPort = portValue ? Number.parseInt(portValue, 10) : DEFAULT_PORT;
const port = Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort;

app.listen(port, () => {
  console.log(`PlatePilot backend listening on port ${port}`);
});
