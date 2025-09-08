const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Authorization = require("../models/Authorization");
function getOriginFromEnv(raw) {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`; // bỏ sạch path/query/hash
  } catch {
    throw new Error(`Invalid SERVER_URL: ${raw}`);
  }
}

const ORIGIN = getOriginFromEnv(process.env.SERVER_URL);
const CALLBACK_BASE = `${ORIGIN}/api/users/auth`;
// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${CALLBACK_BASE}/google/callback`,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const fullName = profile.displayName;
        const googleId = profile.id;
        const avatarUrl = profile.photos[0]?.value;

        console.log("[OAuth][Google] Callback received", {
          googleId,
          email,
          fullName,
          hasAvatar: Boolean(avatarUrl),
        });

        // Try to find by google_id first, then by email if available
        let user;
        try {
          user = await User.findOne({ where: { google_id: googleId } });
          console.log(
            "[OAuth][Google] Find by google_id result:",
            Boolean(user)
          );
        } catch (findError) {
          console.error(
            "[OAuth][Google] Error finding by google_id:",
            findError.message
          );
          throw findError;
        }

        if (!user && email) {
          try {
            user = await User.findOne({ where: { email } });
            console.log("[OAuth][Google] Find by email result:", Boolean(user));
          } catch (findError) {
            console.error(
              "[OAuth][Google] Error finding by email:",
              findError.message
            );
            throw findError;
          }
        }

        if (!user) {
          // Create new user
          // Generate username from email or fallback
          let username;
          if (email) {
            const emailPrefix = email.split("@")[0];
            const randomNum = Math.floor(Math.random() * 9999) + 1000;
            username = `${emailPrefix}${randomNum}`.slice(0, 30);
          } else {
            username = `gg_${Date.now()}`.slice(0, 30);
          }

          // Use full name if available and meaningful, otherwise use username
          const finalFullName =
            fullName && fullName.trim() && fullName !== email
              ? fullName
              : username;

          user = await User.create({
            full_name: finalFullName,
            username,
            email: email || null, // Save email if available
            google_id: googleId,
            avatar_url: avatarUrl,
          });
          console.log("[OAuth][Google] Created new user", {
            userId: user.id,
            username,
            fullName: finalFullName,
            hasEmail: Boolean(email),
          });
        } else {
          // Update social fields if missing/changed
          const updates = {};
          if (!user.google_id) updates.google_id = googleId;
          if (avatarUrl && user.avatar_url !== avatarUrl)
            updates.avatar_url = avatarUrl;
          if (email && !user.email) updates.email = email; // Add email if missing
          if (
            fullName &&
            fullName.trim() &&
            fullName !== email &&
            (!user.full_name || user.full_name === user.username)
          ) {
            updates.full_name = fullName; // Update full name if it's better than current
          }

          if (Object.keys(updates).length) {
            await user.update(updates);
            console.log("[OAuth][Google] Updated user fields", updates);
          } else {
            console.log("[OAuth][Google] No user updates needed");
          }
        }

        // Generate JWT tokens
        const accessTokenJwt = jwt.sign(
          { userId: user.id, email: user.email, isAdmin: user.isAdmin },
          process.env.JWT_ACCESS_SECRET,
          { expiresIn: "1d" }
        );
        const refreshTokenJwt = jwt.sign(
          { userId: user.id },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: "15d" }
        );
        console.log("[OAuth][Google] JWT tokens generated", {
          userId: user.id,
          accessExpDays: 1,
          refreshExpDays: 15,
        });

        // Update authorization
        await Authorization.destroy({ where: { user_id: user.id } });
        await Authorization.create({
          user_id: user.id,
          access_token: accessTokenJwt,
          refresh_token: refreshTokenJwt,
        });
        console.log("[OAuth][Google] Authorization stored", {
          userId: user.id,
        });

        return done(null, {
          user,
          accessToken: accessTokenJwt,
          refreshToken: refreshTokenJwt,
        });
      } catch (error) {
        console.error("[OAuth][Google] Error:", error.message);
        return done(error, null);
      }
    }
  )
);

// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${CALLBACK_BASE}/facebook/callback`,
      profileFields: ["id", "displayName", "photos", "email"], // Thêm email
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Facebook có thể trả về email trong profile nếu có quyền
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const fullName = profile.displayName;
        const facebookId = profile.id;
        const avatarUrl = profile.photos[0]?.value;

        console.log("[OAuth][Facebook] Callback received", {
          facebookId,
          email,
          fullName,
          hasAvatar: Boolean(avatarUrl),
        });

        // Try to find by facebook_id first, then by email if available
        let user = await User.findOne({ where: { facebook_id: facebookId } });
        console.log(
          "[OAuth][Facebook] Find by facebook_id result:",
          Boolean(user)
        );
        if (!user && email) {
          user = await User.findOne({ where: { email } });
          console.log("[OAuth][Facebook] Find by email result:", Boolean(user));
        }

        if (!user) {
          // Create new user
          // Generate username from email or fallback
          let username;
          if (email) {
            const emailPrefix = email.split("@")[0];
            const randomNum = Math.floor(Math.random() * 9999) + 1000;
            username = `${emailPrefix}${randomNum}`.slice(0, 30);
          } else {
            const randomNum = Math.floor(Math.random() * 9999) + 1000;
            username = `fb_${facebookId}_${randomNum}`.slice(0, 30);
          }

          // Use full name if available and meaningful, otherwise use username
          const finalFullName =
            fullName && fullName.trim() ? fullName : username;

          user = await User.create({
            full_name: finalFullName,
            username,
            email: email || null, // Save real email if available, not fake one
            facebook_id: facebookId,
            avatar_url: avatarUrl,
          });
          console.log("[OAuth][Facebook] Created new user", {
            userId: user.id,
            username,
            fullName: finalFullName,
            hasEmail: Boolean(email),
          });
        } else {
          // Update social fields if missing/changed
          const updates = {};
          if (!user.facebook_id) updates.facebook_id = facebookId;
          if (avatarUrl && user.avatar_url !== avatarUrl)
            updates.avatar_url = avatarUrl;
          if (email && !user.email) updates.email = email; // Add real email if missing
          if (
            fullName &&
            fullName.trim() &&
            (!user.full_name || user.full_name === user.username)
          ) {
            updates.full_name = fullName; // Update full name if it's better than current
          }

          if (Object.keys(updates).length) {
            await user.update(updates);
            console.log("[OAuth][Facebook] Updated user fields", updates);
          } else {
            console.log("[OAuth][Facebook] No user updates needed");
          }
        }

        // Generate JWT tokens
        const accessTokenJwt = jwt.sign(
          { userId: user.id, email: user.email, isAdmin: user.isAdmin },
          process.env.JWT_ACCESS_SECRET,
          { expiresIn: "1d" }
        );
        const refreshTokenJwt = jwt.sign(
          { userId: user.id },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: "15d" }
        );
        console.log("[OAuth][Facebook] JWT tokens generated", {
          userId: user.id,
          accessExpDays: 1,
          refreshExpDays: 15,
        });

        // Update authorization
        await Authorization.destroy({ where: { user_id: user.id } });
        await Authorization.create({
          user_id: user.id,
          access_token: accessTokenJwt,
          refresh_token: refreshTokenJwt,
        });
        console.log("[OAuth][Facebook] Authorization stored", {
          userId: user.id,
        });

        return done(null, {
          user,
          accessToken: accessTokenJwt,
          refreshToken: refreshTokenJwt,
        });
      } catch (error) {
        console.error("[OAuth][Facebook] Error:", error.message);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
