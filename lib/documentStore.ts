// Global in-memory store (lives for the server session)
interface DocumentStore {
  summary: string;
  risk_level: string;
  clauses: {
    original: string;
    simple: string;
    risk: boolean;
    explanation: string;
  }[];
}

interface DocumentStore {
  text: string; // ✅ ADD THIS
  summary: string;
  risk_level: string;
  clauses: {
    original: string;
    simple: string;
    risk: boolean;
    explanation: string;
  }[];
}

let store: DocumentStore | null = null;

export function setDocument(data: DocumentStore) {
  store = data;
}

export function getDocument(): DocumentStore | null {
  return store;
}