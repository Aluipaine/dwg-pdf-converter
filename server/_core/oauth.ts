import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import crypto from "crypto";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// Google OAuth configuration
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getGoogleRedirectUri(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${protocol}://${host}/api/oauth/google/callback`;
}

export function registerOAuthRoutes(app: Express) {
  // Dev login route - available when Google OAuth is not configured or in dev mode
  const devLoginEnabled = !ENV.isProduction || !ENV.googleClientId;

  if (devLoginEnabled) {
    app.get("/api/dev-login", async (req: Request, res: Response) => {
      const openId = getQueryParam(req, "openId") || "test-user-123";

      try {
        // Get or create the test user
        let user = await db.getUserByOpenId(openId);

        if (!user) {
          // Create test user if doesn't exist
          await db.upsertUser({
            openId,
            name: "Test User",
            email: "test@example.com",
            loginMethod: "dev",
            lastSignedIn: new Date(),
          });
          user = await db.getUserByOpenId(openId);
        }

        if (!user) {
          res.status(500).json({ error: "Failed to create test user" });
          return;
        }

        // Create session token
        const sessionToken = await sdk.createSessionToken(openId, {
          name: user.name || "Test User",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        console.log("[Dev Login] Logged in as:", openId);
        res.redirect(302, "/");
      } catch (error) {
        console.error("[Dev Login] Failed:", error);
        res.status(500).json({ error: "Dev login failed" });
      }
    });

    console.log("[Dev] Dev login available at /api/dev-login");
  }

  // ============================================
  // Google OAuth Routes
  // ============================================

  // Initiate Google OAuth login
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.redirect("/api/dev-login");
      return;
    }

    const redirectUri = getGoogleRedirectUri(req);
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in cookie for verification
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: ENV.isProduction,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: state,
      access_type: "offline",
      prompt: "consent",
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // Google OAuth callback
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");
    const storedState = req.cookies?.oauth_state;

    // Clear the state cookie
    res.clearCookie("oauth_state");

    if (error) {
      console.error("[Google OAuth] Error:", error);
      res.redirect("/?error=oauth_denied");
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    if (!state || state !== storedState) {
      res.status(400).json({ error: "Invalid state parameter" });
      return;
    }

    try {
      const redirectUri = getGoogleRedirectUri(req);

      // Exchange code for tokens
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("[Google OAuth] Token error:", errorData);
        throw new Error("Failed to exchange code for token");
      }

      const tokens = (await tokenResponse.json()) as { access_token: string };

      // Get user info from Google
      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error("Failed to get user info from Google");
      }

      const googleUser = (await userInfoResponse.json()) as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      // Use Google ID as openId
      const openId = `google_${googleUser.id}`;

      // Upsert user in database
      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email || null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      console.log("[Google OAuth] Login successful:", googleUser.email);
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed:", error);
      res.redirect("/?error=oauth_failed");
    }
  });

  // Login page route - redirects to appropriate OAuth provider
  app.get("/api/login", (req: Request, res: Response) => {
    if (ENV.googleClientId) {
      res.redirect("/api/oauth/google");
    } else {
      res.redirect("/api/dev-login");
    }
  });

  // Legacy Manus OAuth callback (keep for compatibility)
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
