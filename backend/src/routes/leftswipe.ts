import { Router, Request, Response, NextFunction } from "express";
import admin from "../firebase/admin.js";

interface AuthenticatedRequest extends Request {
	user?: {
		uid: string;
		[key: string]: any;
	};
}

type LeftSwipeRequestBody = {
	targetUserId?: string;
};

const router = Router();

// Middleware to verify Firebase ID token or Session cookie
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
	const authHeader = (req.headers.authorization || "") as string;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res
			.status(401)
			.json({ success: false, message: "No token provided" });
	}

	const token = authHeader.split("Bearer ")[1];

	try {
		const decodedToken = await admin.auth().verifyIdToken(token);
		(req as AuthenticatedRequest).user = decodedToken as any;
		return next();
	} catch (error: any) {
		console.error("ID token verification failed:", error.message);

		try {
			const decodedToken = await admin
				.auth()
				.verifySessionCookie(token, true)
				.catch(() => {
					throw new Error("Not a session cookie");
				});
			(req as AuthenticatedRequest).user = decodedToken as any;
			return next();
		} catch (customError: any) {
			console.error(
				"Session cookie verification also failed:",
				customError.message
			);
			return res
				.status(401)
				.json({ success: false, message: "Invalid or expired token" });
		}
	}
};

// Left swipe: store the target user's id in current user's `leftswiped` array
router.post("/", verifyToken, async (req: Request, res: Response) => {
	try {
		const userId = (req as AuthenticatedRequest).user!.uid;
		const { targetUserId } = (req.body || {}) as LeftSwipeRequestBody;

		if (!targetUserId || targetUserId.trim() === "") {
			return res.status(400).json({
				success: false,
				message: "targetUserId is required",
			});
		}

		if (targetUserId === userId) {
			return res.status(400).json({
				success: false,
				message: "Cannot left-swipe yourself",
			});
		}

		const userDocRef = admin.firestore().collection("users").doc(userId);
		const userDoc = await userDocRef.get();
		if (!userDoc.exists) {
			return res.status(404).json({
				success: false,
				message: "User profile not found",
			});
		}

		await userDocRef.update({
			leftswiped: admin.firestore.FieldValue.arrayUnion(targetUserId),
			updatedAt: new Date().toISOString(),
		});

		return res.json({
			success: true,
			message: "Left swipe recorded successfully",
		});
	} catch (error) {
		console.error("Left swipe error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to record left swipe",
		});
	}
});

export default router;
