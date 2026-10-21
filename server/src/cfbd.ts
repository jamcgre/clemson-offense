const BASE_URL = "https://api.collegefootballdata.com";

export async function cfbdList(
  path: string,
  options?: { allowNotFound?: boolean },
): Promise<Record<string, unknown>[]> {
  const data = await cfbdGet<unknown>(path, options);
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error(`Expected a list from ${path}`);
  }
  return data.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
}

async function cfbdGet<T>(path: string, options?: { allowNotFound?: boolean }): Promise<T | null> {
  const key = process.env.CFBD_API_KEY?.trim();
  if (!key) {
    throw new Error("Set CFBD_API_KEY in server/.env. Create a key at https://collegefootballdata.com.");
  }

  const url = `${BASE_URL}${path}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "User-Agent": "clemson-offense-lab",
      },
    });

    if (response.status === 429 || response.status >= 500) {
      await sleep(400 * (attempt + 1));
      continue;
    }
    if (response.status === 404 && options?.allowNotFound) {
      await sleep(120);
      return null;
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("CollegeFootballData rejected CFBD_API_KEY.");
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${path}: ${body.slice(0, 240)}`);
    }

    const json = (await response.json()) as T;
    await sleep(120);
    return json;
  }

  throw new Error(`CollegeFootballData kept failing for ${path}.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
