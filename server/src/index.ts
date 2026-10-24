import { createApp } from "./routes";

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://localhost:${port}`);
});
