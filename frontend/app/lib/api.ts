import type {
  AssessmentRequest,
  DetectResponse,
  EvaluateResponse,
  GeoJSONPolygon,
  RulesResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new ApiError(`Could not reach the assessment server at ${API_BASE}. Is the backend running?`);
  }
  if (!res.ok) {
    throw new ApiError(`Request to ${path} failed: ${res.statusText}`, res.status);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Could not reach the assessment server at ${API_BASE}. Is the backend running?`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = await res.json();
      detail = errBody?.detail ? JSON.stringify(errBody.detail) : detail;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new ApiError(`Request to ${path} failed: ${detail}`, res.status);
  }

  return res.json() as Promise<T>;
}

export function detectFeatures(polygon: GeoJSONPolygon): Promise<DetectResponse> {
  return post<DetectResponse>("/detect", { polygon });
}

export function getRules(): Promise<RulesResponse> {
  return get<RulesResponse>("/rules");
}

export function evaluateAssessment(payload: AssessmentRequest): Promise<EvaluateResponse> {
  return post<EvaluateResponse>("/evaluate", payload);
}

export { ApiError };