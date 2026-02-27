import { Router, Request, Response, NextFunction } from "express";
import admin from "../firebase/admin.js";

interface AuthenticatedRequest extends Request {
	user?: {
		uid: string;
		[key: string]: any;
	};
}

type AnyProfile = Record<string, any>;

type RecommendationCardUser = {
	uid: string;
	fullName?: string;
	age?: number;
	role?: string;
	location?: string | null;
	city?: string | null;
	country?: string | null;
	aboutMe?: string;
	profileImage?: string;
	githubProfileUrl?: string;
	interests?: string[];
	goal?: string | null;
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

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
	const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.min(max, Math.max(min, parsed));
};

const normalizeStringArray = (value: any): string[] => {
	if (!value) return [];
	if (Array.isArray(value)) {
		return value
			.map((v) => (typeof v === "string" ? v.trim() : ""))
			.filter((v) => v.length > 0);
	}
	if (typeof value === "string") {
		return value
			.split(",")
			.map((v) => v.trim())
			.filter((v) => v.length > 0);
	}
	return [];
};

const computeAgeFromDob = (dob: any): number | undefined => {
	if (!dob) return undefined;
	const date = new Date(dob);
	if (Number.isNaN(date.getTime())) return undefined;
	const today = new Date();
	let age = today.getFullYear() - date.getFullYear();
	const monthDiff = today.getMonth() - date.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
		age--;
	}
	return age;
};

const buildCardUser = (profile: AnyProfile): RecommendationCardUser => {
	const geolocation = (profile.geolocation || {}) as AnyProfile;
	const city = (profile.city ?? geolocation.city ?? null) as string | null;
	const country = (profile.country ?? geolocation.country ?? null) as string | null;
	const location =
		(profile.location ??
			(city || country
				? [city, country].filter(Boolean).join(", ")
				: null)) ?? null;

	const interests = normalizeStringArray(profile.interests ?? profile.interest);
	const goal = (profile.relationshipGoals ?? profile.goal ?? null) as string | null;
	const age =
		typeof profile.age === "number"
			? profile.age
			: computeAgeFromDob(profile.dateOfBirth);

	return {
		uid: String(profile.uid || ""),
		fullName: profile.fullName,
		age,
		role: profile.role,
		location,
		city,
		country,
		aboutMe: profile.aboutMe,
		profileImage: profile.profileImage,
		githubProfileUrl: profile.githubProfileUrl,
		interests: interests.length ? interests : undefined,
		goal,
	};
};

const scoreCandidate = (me: AnyProfile, them: AnyProfile): number => {
	let score = 0;

	const myGoal = (me.relationshipGoals ?? me.goal ?? "") as string;
	const theirGoal = (them.relationshipGoals ?? them.goal ?? "") as string;
	if (myGoal && theirGoal && myGoal.toLowerCase() === theirGoal.toLowerCase()) {
		score += 10;
	}

	const myInterests = new Set(
		normalizeStringArray(me.interests ?? me.interest).map((x) => x.toLowerCase())
	);
	const theirInterests = normalizeStringArray(them.interests ?? them.interest).map((x) =>
		x.toLowerCase()
	);
	let shared = 0;
	for (const interest of theirInterests) {
		if (myInterests.has(interest)) shared++;
	}
	score += Math.min(9, shared * 3);

	const myGeo = (me.geolocation || {}) as AnyProfile;
	const theirGeo = (them.geolocation || {}) as AnyProfile;
	const myCountry = (me.country ?? myGeo.country ?? "") as string;
	const theirCountry = (them.country ?? theirGeo.country ?? "") as string;
	if (myCountry && theirCountry && myCountry.toLowerCase() === theirCountry.toLowerCase()) {
		score += 4;
	}
	const myCity = (me.city ?? myGeo.city ?? "") as string;
	const theirCity = (them.city ?? theirGeo.city ?? "") as string;
	if (myCity && theirCity && myCity.toLowerCase() === theirCity.toLowerCase()) {
		score += 2;
	}

	const myRole = (me.role ?? "") as string;
	const theirRole = (them.role ?? "") as string;
	if (myRole && theirRole) {
		const a = myRole.toLowerCase();
		const b = theirRole.toLowerCase();
		if (a === b) score += 3;
		else if (a.includes(b) || b.includes(a)) score += 2;
	}

	const myAge =
		typeof me.age === "number" ? me.age : computeAgeFromDob(me.dateOfBirth);
	const theirAge =
		typeof them.age === "number" ? them.age : computeAgeFromDob(them.dateOfBirth);
	if (typeof myAge === "number" && typeof theirAge === "number") {
		const diff = Math.abs(myAge - theirAge);
		if (diff <= 2) score += 4;
		else if (diff <= 5) score += 2;
		else if (diff <= 10) score += 1;
	}

	const myGenderPref = (me.genderPreference ?? "") as string;
	const theirGender = (them.gender ?? "") as string;
	if (myGenderPref && theirGender) {
		if (myGenderPref.toLowerCase() === theirGender.toLowerCase()) score += 2;
	}

	return score;
};

// Get recommended users (authenticated)
// Returns an array of up to 20 user profiles (card-ready) excluding already left-swiped users.
router.get("/", verifyToken, async (req: Request, res: Response) => {
	try {
		const userId = (req as AuthenticatedRequest).user!.uid;
		const limit = clampInt(req.query.limit, 1, 50, 20);
		const candidateFetchLimit = Math.min(500, Math.max(200, limit * 15));

		const meDoc = await admin.firestore().collection("users").doc(userId).get();
		if (!meDoc.exists) {
			return res.status(404).json({
				success: false,
				message: "User profile not found",
			});
		}
		const me = meDoc.data() as AnyProfile;
		const leftSwiped = new Set<string>(
			normalizeStringArray(me.leftswiped ?? []).map((x) => String(x))
		);

		const snapshot = await admin
			.firestore()
			.collection("users")
			.limit(candidateFetchLimit)
			.get();

		const scored: Array<{ score: number; updatedAt?: string; profile: AnyProfile }> = [];
		for (const doc of snapshot.docs) {
			const profile = doc.data() as AnyProfile;
			const uid = String(profile.uid || doc.id);
			profile.uid = uid;

			if (!uid || uid === userId) continue;
			if (leftSwiped.has(uid)) continue;

			scored.push({
				score: scoreCandidate(me, profile),
				updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : undefined,
				profile,
			});
		}

		scored.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
			const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
			return bTime - aTime;
		});

		const users = scored.slice(0, limit).map(({ profile }) => {
			const cardUser = buildCardUser(profile);
			// Never return email in recommendations
			delete (cardUser as any).email;
			return cardUser;
		});

		return res.json({
			success: true,
			message: "Recommendations retrieved successfully",
			count: users.length,
			users,
		});
	} catch (error) {
		console.error("Recommendations error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to retrieve recommendations",
		});
	}
});

export default router;
