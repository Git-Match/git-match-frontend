export const getDominantColors = (
	imageSrc: string
): Promise<[string, string, string]> => {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = imageSrc;

		img.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) return resolve(fallback());

			const SIZE = 80;
			canvas.width = SIZE;
			canvas.height = SIZE;
			ctx.drawImage(img, 0, 0, SIZE, SIZE);

			const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

			type HSL = { h: number; s: number; l: number };
			const colors: HSL[] = [];

			for (let i = 0; i < data.length; i += 4) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];

				const hsl = rgbToHsl(r, g, b);

				// Ignore extreme noise only
				if (hsl.l < 0.05 || hsl.l > 0.95) continue;

				colors.push(hsl);
			}

			if (colors.length < 30) return resolve(fallback());

			// ---- ROLE EXTRACTION ----

			const shadow = pickDark(colors);
			const highlight = pickLight(colors, shadow);
			const mid = pickMid(colors, shadow, highlight);

			resolve([stylize(shadow), stylize(mid), stylize(highlight)]);
		};

		img.onerror = () => resolve(fallback());
	});
};

const pickDark = (colors: any[]) =>
	averageHsl(
		colors
			.filter((c) => c.l < 0.25)
			.sort((a, b) => b.s - a.s)
			.slice(0, 50)
	);

const pickLight = (colors: any[], dark: any) =>
	averageHsl(
		colors
			.filter((c) => c.l > 0.55 && hueDistance(c.h, dark.h) > 30)
			.sort((a, b) => b.s - a.s)
			.slice(0, 40)
	);

const pickMid = (colors: any[], dark: any, light: any) =>
	averageHsl(
		colors
			.filter(
				(c) =>
					c.l >= 0.25 &&
					c.l <= 0.55 &&
					hueDistance(c.h, dark.h) > 20 &&
					hueDistance(c.h, light.h) > 20
			)
			.sort((a, b) => b.s - a.s)
			.slice(0, 40)
	);

const fallback = (): [string, string, string] => [
	"#2d1b4e",
	"#1b0f2f",
	"#0d0a1e",
];

const hueDistance = (a: number, b: number) =>
	Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

const averageHsl = (colors: { h: number; s: number; l: number }[]) => {
	const len = colors.length;
	return colors.reduce(
		(acc, c) => ({
			h: acc.h + c.h / len,
			s: acc.s + c.s / len,
			l: acc.l + c.l / len,
		}),
		{ h: 0, s: 0, l: 0 }
	);
};

const rgbToHsl = (r: number, g: number, b: number) => {
	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0,
		s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}

		h *= 60;
	}

	return { h, s, l };
};

const stylize = ({ h, s, l }: any) =>
	`hsl(
    ${Math.round(h)},
    ${Math.round(Math.min(s + 0.12, 1) * 100)}%,
    ${Math.round(Math.min(l, 0.42) * 100)}%
  )`;
