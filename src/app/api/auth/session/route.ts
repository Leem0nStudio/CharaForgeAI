import { auth, db } from "@/lib/firebase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  console.log("[/api/auth/session POST] Received request");
  const authorization = request.headers.get("Authorization");
  console.log("[/api/auth/session POST] Authorization header:", authorization);
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    console.log("[/api/auth/session POST] ID Token received");
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log("[/api/auth/session POST] ID Token verified for user:", decodedToken.uid);

      if (decodedToken) {
        const expiresIn = 60 * 60 * 24 * 7 * 1000;
        const sessionCookie = await auth.createSessionCookie(idToken, {
          expiresIn,
        });
        console.log("[/api/auth/session POST] Session cookie created");

        const options = {
          name: "__session",
          value: sessionCookie,
          maxAge: expiresIn,
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax' as 'lax' | 'strict' | 'none',
        };

        // Use the 'cookies' API from Next.js to set the cookie
        cookies().set(options);
        console.log("[/api/auth/session POST] Session cookie set in headers");

        // Create user in Firestore if they don't exist
        const userRef = db.collection("users").doc(decodedToken.uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
           console.log("[/api/auth/session POST] User not found in Firestore, creating...");
          await userRef.set({
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name,
            photoURL: decodedToken.picture,
            purchasedPacks: [],
            installedPacks: ["core_base_styles"],
            subscriptionTier: "free",
            totalLikes: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
           console.log("[/api/auth/session POST] User created in Firestore");
        }
      }
    } catch (error) {
       console.error("[/api/auth/session POST] Error during ID token verification or session cookie creation:", error);
    }
  } else {
     console.log("[/api/auth/session POST] No Bearer token in Authorization header");
  }

  return NextResponse.json({}, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  console.log("[/api/auth/session DELETE] Received request");
  const session = cookies().get("__session")?.value || "";
  console.log("[/api/auth/session DELETE] Session cookie found:", !!session);

  if (!session) {
    return NextResponse.json({ status: "No session found" }, { status: 400 });
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(session, true);
     console.log("[/api/auth/session DELETE] Session cookie verified for user:", decodedClaims.sub);
    await auth.revokeRefreshTokens(decodedClaims.sub);
     console.log("[/api/auth/session DELETE] Refresh tokens revoked");
    cookies().delete("__session");
     console.log("[/api/auth/session DELETE] Session cookie deleted");
    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    console.error("[/api/auth/session DELETE] Error during session cookie verification or revocation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
