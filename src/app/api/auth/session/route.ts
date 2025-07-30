import { auth, db } from "@/lib/firebase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    if (decodedToken) {
      // 7 days expiry
      const expiresIn = 60 * 60 * 24 * 7 * 1000;
      const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn,
      });
      const options = {
        name: "__session",
        value: sessionCookie,
        maxAge: expiresIn,
        httpOnly: true,
        secure: true,
      };

      cookies().set(options);

      // Create user in Firestore if they don't exist
      const userRef = db.collection("users").doc(decodedToken.uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        await userRef.set({
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
          purchasedPacks: [],
          installedPacks: ["core_base_styles"],
          subscriptionTier: "free",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }

  return NextResponse.json({}, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const session = cookies().get("__session")?.value || "";

  if (!session) {
    return NextResponse.json({ status: "No session found" }, { status: 400 });
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(session, true);
    await auth.revokeRefreshTokens(decodedClaims.sub);
    cookies().delete("__session");
    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    console.error("Error revoking session cookie", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
