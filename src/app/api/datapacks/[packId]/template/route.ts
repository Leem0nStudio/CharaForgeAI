import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth, db } from "@/lib/firebase/server";
import { getStorage } from "firebase-admin/storage";

// This is a simplified user schema for this route's purpose
interface User {
    installedPacks: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { packId: string } }
) {
  const { packId } = params;
  const session = cookies().get("__session")?.value || "";

  if (!session) {
    return new NextResponse("Unauthorized: No session cookie found.", { status: 401 });
  }

  try {
    // 1. Verify user session
    const decodedClaims = await auth.verifySessionCookie(session, true);
    const userId = decodedClaims.uid;

    // 2. Check user's installed packs in Firestore
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return new NextResponse("User not found.", { status: 404 });
    }

    const user = userDoc.data() as User;
    if (!user.installedPacks || !user.installedPacks.includes(packId)) {
        return new NextResponse("Forbidden: User does not have this DataPack installed.", { status: 403 });
    }

    // 3. Fetch the YAML template from Firebase Storage
    const bucket = getStorage().bucket(); // Assumes default bucket
    const filePath = `DataPacks/${packId}/prompt_template.yaml`;
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
        return new NextResponse("Template file not found in Storage.", { status: 404 });
    }
    
    const [data] = await file.download();
    const yamlContent = data.toString("utf-8");

    // 4. Return the YAML content
    return new NextResponse(yamlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/yaml",
      },
    });

  } catch (error: any) {
    console.error("Error fetching DataPack template:", error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked') {
         return new NextResponse("Unauthorized: Invalid session.", { status: 401 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
