import passport from "passport";
import { Strategy as FacebookStrategy, type Profile } from "passport-facebook";
import type { Express, RequestHandler } from "express";
import { authStorage } from "./storage";
import { getSession } from "./session";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set. Add it to your environment/.env file.`);
  }
  return value;
}

function getAppUrl(): string {
  // Fixed public URL of the deployed site, e.g. https://yourdomain.com
  // Must exactly match a "Valid OAuth Redirect URI" configured on the Meta App.
  return (process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "");
}

export { getSession };

interface SessionUser {
  claims: {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
  access_token?: string;
}

async function upsertUser(profile: Profile) {
  const email = profile.emails?.[0]?.value;
  await authStorage.upsertUser({
    id: profile.id,
    email,
    firstName: profile.name?.givenName,
    lastName: profile.name?.familyName,
    profileImageUrl: profile.photos?.[0]?.value,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const clientID = requireEnv("FACEBOOK_APP_ID");
  const clientSecret = requireEnv("FACEBOOK_APP_SECRET");

  passport.use(
    new FacebookStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: `${getAppUrl()}/api/callback`,
        profileFields: ["id", "displayName", "name", "emails", "photos"],
        graphAPIVersion: "v21.0",
      },
      async (accessToken, _refreshToken, profile, done) => {
        try {
          await upsertUser(profile);
          const user: SessionUser = {
            claims: {
              sub: profile.id,
              email: profile.emails?.[0]?.value,
              first_name: profile.name?.givenName,
              last_name: profile.name?.familyName,
              profile_image_url: profile.photos?.[0]?.value,
            },
            access_token: accessToken,
          };
          done(null, user as Express.User);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get(
    "/api/login",
    passport.authenticate("facebook", { scope: ["email"] })
  );

  app.get(
    "/api/callback",
    passport.authenticate("facebook", {
      successRedirect: "/",
      failureRedirect: "/api/login",
    })
  );

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !(req.user as SessionUser | undefined)?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
