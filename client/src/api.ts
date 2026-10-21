export async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch {
    throw new Error("The API is not running. Start it with npm run dev:server.");
  }

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "The API could not be reached. Start it with npm run dev:server.");
  }
  return body as T;
}
