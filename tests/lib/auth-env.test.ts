// Implements scenarios: "Kill-switch off — buttons hidden, routes 404" (env half).
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  readAuthEnv,
  isAuthEnabled,
  AuthDisabledError,
  MissingAuthEnvError,
} from "@/lib/auth-env";
import { PROVIDER_GOOGLE, PROVIDER_FACEBOOK } from "@/lib/auth-providers";

const ENV_KEYS = [
  "NEXT_PUBLIC_AUTH_ENABLED",
  "ZITADEL_ISSUER",
  "ZITADEL_CLIENT_ID",
  "ZITADEL_CLIENT_SECRET",
  "ZITADEL_IDP_GOOGLE",
  "ZITADEL_IDP_FACEBOOK",
  "AUTH_REDIRECT_URI",
  "AUTH_COOKIE_SECRET",
] as const;

let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = {};
  for (const k of ENV_KEYS) {
    snapshot[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
});

function setHappyEnv() {
  process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
  process.env.ZITADEL_ISSUER = "https://example.zitadel.cloud";
  process.env.ZITADEL_CLIENT_ID = "111@hulubul";
  process.env.ZITADEL_CLIENT_SECRET = "shh";
  process.env.ZITADEL_IDP_GOOGLE = "222";
  process.env.AUTH_REDIRECT_URI = "http://localhost:3000/api/auth/callback";
  process.env.AUTH_COOKIE_SECRET =
    "a-very-long-secret-that-is-at-least-thirty-two-bytes";
}

describe("Feature: lib/auth-env reader", () => {
  describe("Given the kill-switch is off", () => {
    it("When readAuthEnv is called, Then it throws AuthDisabledError", () => {
      expect(() => readAuthEnv()).toThrow(AuthDisabledError);
    });
    it("And isAuthEnabled returns false without throwing", () => {
      expect(isAuthEnabled()).toBe(false);
    });
  });

  describe("Given the kill-switch is on but required vars are missing", () => {
    it("Then readAuthEnv throws MissingAuthEnvError naming each missing key", () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
      try {
        readAuthEnv();
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(MissingAuthEnvError);
        const msg = (e as Error).message;
        expect(msg).toMatch(/ZITADEL_ISSUER/);
        expect(msg).toMatch(/ZITADEL_CLIENT_ID/);
        expect(msg).toMatch(/AUTH_COOKIE_SECRET/);
      }
    });
  });

  describe("Given a complete env on the happy path", () => {
    it("Then readAuthEnv returns a fully typed AuthEnv", () => {
      setHappyEnv();
      const env = readAuthEnv();
      expect(env.enabled).toBe(true);
      expect(env.issuer).toBe("https://example.zitadel.cloud");
      expect(env.clientId).toBe("111@hulubul");
      expect(env.clientSecret).toBe("shh");
      expect(env.idps[PROVIDER_GOOGLE]).toBe("222");
      expect(env.idps[PROVIDER_FACEBOOK]).toBeUndefined();
      expect(env.redirectUri).toBe(
        "http://localhost:3000/api/auth/callback",
      );
      expect(env.cookieSecret).toMatch(/.{32,}/);
    });
    it("And isAuthEnabled returns true", () => {
      setHappyEnv();
      expect(isAuthEnabled()).toBe(true);
    });
  });

  describe("Given Facebook IdP env is also set", () => {
    it("Then it is exposed via idps[PROVIDER_FACEBOOK]", () => {
      setHappyEnv();
      process.env.ZITADEL_IDP_FACEBOOK = "333";
      const env = readAuthEnv();
      expect(env.idps[PROVIDER_FACEBOOK]).toBe("333");
    });
  });

  describe("Given the cookie secret is shorter than 32 bytes", () => {
    it("Then readAuthEnv throws MissingAuthEnvError", () => {
      setHappyEnv();
      process.env.AUTH_COOKIE_SECRET = "too-short";
      expect(() => readAuthEnv()).toThrow(MissingAuthEnvError);
    });
  });
});
