import { describe, it, expect } from "vitest";
import { getAuthErrorMessage, POPUP_FALLBACK_CODES, SILENT_CODES } from "./authErrors";

describe("getAuthErrorMessage", () => {
  it("maps credential errors to a friendly message", () => {
    expect(getAuthErrorMessage({ code: "auth/invalid-credential" })).toBe("Incorrect email or password.");
  });
  it("explains unauthorized domains with the current host", () => {
    expect(getAuthErrorMessage({ code: "auth/unauthorized-domain" })).toMatch(/Authorized domains/);
  });
  it("strips the Firebase prefix and code from unknown errors", () => {
    const message = getAuthErrorMessage({ code: "auth/odd", message: "Firebase: Something broke (auth/odd)." });
    expect(message).toBe("Something broke");
  });
  it("falls back to a generic message", () => {
    expect(getAuthErrorMessage(undefined)).toMatch(/Authentication failed/);
  });
  it("classifies popup codes", () => {
    expect(POPUP_FALLBACK_CODES.has("auth/popup-blocked")).toBe(true);
    expect(SILENT_CODES.has("auth/popup-closed-by-user")).toBe(true);
  });
});
