import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, ButtonGroup, Col, Form, ListGroup, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { GpioAction, GPElement, GPShape_Type, InputMode } from '@proto/enums';

import { AppContext } from '../Contexts/AppContext';
import Section from '../Components/Section';
import WebApi from '../Services/WebApi';
import { STANDARD_FONT, SYMBOL_CODES, TINY_FONT, TINY_SYMBOLS } from '../Data/DisplayFonts';
import './DisplayLayoutEditorPage.scss';

const SCREEN_WIDTH = 128;
const SCREEN_HEIGHT = 64;
const MAX_COORD = 255;
const FILE_VERSION = 1;

// Must match headers/display/ui/elements/GPButtonIcons.h
const ICON_AUTO = 0;
const ICON_NAME = 253;
const ICON_TEXT = 254;
const ICON_HIDDEN = 255;
const ICONS = [
	{ id: 1, key: 'cross', glyph: [0x11, 0x0a, 0x04, 0x0a, 0x11] },
	{ id: 2, key: 'circle', glyph: [0x0e, 0x11, 0x11, 0x11, 0x0e] },
	{ id: 3, key: 'square', glyph: [0x1f, 0x11, 0x11, 0x11, 0x1f] },
	{ id: 4, key: 'triangle', glyph: [0x04, 0x0a, 0x0a, 0x11, 0x1f] },
	{ id: 5, key: 'A', glyph: [0x0e, 0x11, 0x1f, 0x11, 0x11] },
	{ id: 6, key: 'B', glyph: [0x1e, 0x11, 0x1e, 0x11, 0x1e] },
	{ id: 7, key: 'X', glyph: [0x11, 0x0a, 0x04, 0x0a, 0x11] },
	{ id: 8, key: 'Y', glyph: [0x11, 0x0a, 0x04, 0x04, 0x04] },
	{ id: 9, key: '1', glyph: [0x04, 0x0c, 0x04, 0x04, 0x0e] },
	{ id: 10, key: '2', glyph: [0x1e, 0x01, 0x0e, 0x10, 0x1f] },
	{ id: 11, key: '3', glyph: [0x1e, 0x01, 0x06, 0x01, 0x1e] },
	{ id: 12, key: '4', glyph: [0x12, 0x12, 0x1f, 0x02, 0x02] },
];
const ICON_BY_ID = Object.fromEntries(ICONS.map((icon) => [icon.id, icon]));

// face index (B1..B4) -> icon id, per family of input modes
const ICON_FAMILIES = {
	ps: [1, 2, 3, 4],
	xbox: [5, 6, 7, 8],
	nintendo: [6, 5, 8, 7],
	hid: [10, 11, 9, 12],
};
const MODE_FAMILY = {
	[InputMode.INPUT_MODE_PS3]: 'ps',
	[InputMode.INPUT_MODE_PS4]: 'ps',
	[InputMode.INPUT_MODE_PS5]: 'ps',
	[InputMode.INPUT_MODE_P5GENERAL]: 'ps',
	[InputMode.INPUT_MODE_PSCLASSIC]: 'ps',
	[InputMode.INPUT_MODE_XINPUT]: 'xbox',
	[InputMode.INPUT_MODE_XBONE]: 'xbox',
	[InputMode.INPUT_MODE_XBOXORIGINAL]: 'xbox',
	[InputMode.INPUT_MODE_SWITCH]: 'nintendo',
	[InputMode.INPUT_MODE_SWITCH_PRO]: 'nintendo',
	[InputMode.INPUT_MODE_GENERIC]: 'hid',
};
const PREVIEW_MODES = [
	'INPUT_MODE_XINPUT',
	'INPUT_MODE_XBONE',
	'INPUT_MODE_PS4',
	'INPUT_MODE_PS5',
	'INPUT_MODE_P5GENERAL',
	'INPUT_MODE_SWITCH',
	'INPUT_MODE_GENERIC',
	'INPUT_MODE_KEYBOARD',
];

const BUTTON_MASKS = [
	['B1', 1 << 0],
	['B2', 1 << 1],
	['B3', 1 << 2],
	['B4', 1 << 3],
	['L1', 1 << 4],
	['R1', 1 << 5],
	['L2', 1 << 6],
	['R2', 1 << 7],
	['S1', 1 << 8],
	['S2', 1 << 9],
	['L3', 1 << 10],
	['R3', 1 << 11],
	['A1', 1 << 12],
	['A2', 1 << 13],
	['A3', 1 << 14],
	['A4', 1 << 15],
];
const DPAD_MASKS = [
	['UP', 1 << 0],
	['DOWN', 1 << 1],
	['LEFT', 1 << 2],
	['RIGHT', 1 << 3],
];
const FACE_ACTIONS = [
	GpioAction.BUTTON_PRESS_B1,
	GpioAction.BUTTON_PRESS_B2,
	GpioAction.BUTTON_PRESS_B3,
	GpioAction.BUTTON_PRESS_B4,
];
const GPIO_ACTION_NAMES = Object.fromEntries(
	Object.entries(GpioAction)
		.filter(([, value]) => typeof value === 'number')
		.map(([name, value]) => [value, name]),
);

const EDITABLE_TYPES = [
	GPElement.GP_ELEMENT_PIN_BUTTON,
	GPElement.GP_ELEMENT_BTN_BUTTON,
	GPElement.GP_ELEMENT_DIR_BUTTON,
	GPElement.GP_ELEMENT_LEVER,
	GPElement.GP_ELEMENT_SHAPE,
	GPElement.GP_ELEMENT_LABEL,
];
const BUTTON_TYPES = [
	GPElement.GP_ELEMENT_PIN_BUTTON,
	GPElement.GP_ELEMENT_BTN_BUTTON,
	GPElement.GP_ELEMENT_DIR_BUTTON,
];
const SHAPES = [
	GPShape_Type.GP_SHAPE_ELLIPSE,
	GPShape_Type.GP_SHAPE_SQUARE,
	GPShape_Type.GP_SHAPE_PILL,
	GPShape_Type.GP_SHAPE_POLYGON,
	GPShape_Type.GP_SHAPE_ARC,
	GPShape_Type.GP_SHAPE_LINE,
];

const FIELDS = [
	'type',
	'x1',
	'y1',
	'x2',
	'y2',
	'stroke',
	'fill',
	'value',
	'shape',
	'angleStart',
	'angleEnd',
	'closed',
	'icon',
];

// --- text (must match headers/display/ui/elements/GPTextRender.h) ---------
const TEXT_MAX_LENGTH = 16;
const FONT_TINY = 0;
const FONT_STANDARD = 1;
const SYMBOLS = Object.keys(SYMBOL_CODES);
// printable ASCII plus the display font's symbols (arrows, PlayStation shapes)
const sanitizeText = (text) =>
	[...String(text ?? '')]
		.filter((ch) => (ch >= ' ' && ch <= '~') || SYMBOL_CODES[ch] !== undefined)
		.slice(0, TEXT_MAX_LENGTH)
		.join('');
const textAdvance = (font) => (font === FONT_STANDARD ? 6 : 4);
const textHeight = (font) => (font === FONT_STANDARD ? 7 : 5);
const textWidth = (text, font) => (text.length ? text.length * textAdvance(font) - 1 : 0);
const textPixels = (text, font) => {
	const pixels = [];
	[...text].forEach((ch, i) => {
		let code = SYMBOL_CODES[ch] ?? ch.charCodeAt(0);
		const ox = i * textAdvance(font);
		if (font === FONT_STANDARD) {
			if (code < 32 || code - 32 >= STANDARD_FONT.length / 5) code = 63;
			for (let col = 0; col < 5; col++) {
				const bits = STANDARD_FONT[(code - 32) * 5 + col];
				for (let row = 0; row < 7; row++) if ((bits >> row) & 1) pixels.push([ox + col, row]);
			}
		} else {
			if (code >= 97 && code <= 122) code -= 32;
			let glyph;
			if (code >= 0x80 && code < 0x80 + TINY_SYMBOLS.length) {
				glyph = TINY_SYMBOLS[code - 0x80];
			} else {
				if (code < 32 || code >= 32 + TINY_FONT.length) code = 63;
				glyph = TINY_FONT[code - 32];
			}
			for (let row = 0; row < 5; row++) {
				const bits = (glyph >> ((4 - row) * 3)) & 7;
				for (let col = 0; col < 3; col++) if (bits & (4 >> col)) pixels.push([ox + col, row]);
			}
		}
	});
	return pixels;
};

const toInt = (v, min = 0, max = 65535) => {
	const n = parseInt(v, 10);
	if (Number.isNaN(n)) return min;
	return Math.min(max, Math.max(min, n));
};

// Text of buttons can differ per group of input modes (must match GPButtonIcons.h getButtonModeGroup)
const MODE_GROUPS = [
	{ key: 'playstation', preview: 'INPUT_MODE_PS5', modes: ['INPUT_MODE_PS3', 'INPUT_MODE_PS4', 'INPUT_MODE_PS5', 'INPUT_MODE_P5GENERAL', 'INPUT_MODE_PSCLASSIC'] },
	{ key: 'xbox', preview: 'INPUT_MODE_XINPUT', modes: ['INPUT_MODE_XINPUT', 'INPUT_MODE_XBONE', 'INPUT_MODE_XBOXORIGINAL'] },
	{ key: 'nintendo', preview: 'INPUT_MODE_SWITCH', modes: ['INPUT_MODE_SWITCH', 'INPUT_MODE_SWITCH_PRO'] },
	{ key: 'other', preview: 'INPUT_MODE_GENERIC', modes: [] },
];
const modeGroup = (mode) => {
	const index = MODE_GROUPS.findIndex((g) => g.modes.some((name) => InputMode[name] === mode));
	return index < 0 ? MODE_GROUPS.length - 1 : index;
};

// [...FIELDS, text, textFont (0 auto, 1 3x5, 2 5x7), textPerMode, textPlayStation, textXbox, textNintendo, textOther]
const fromArray = (arr) => {
	const n = FIELDS.length;
	const el = {
		...Object.fromEntries(FIELDS.map((field, i) => [field, toInt(arr?.[i] ?? 0)])),
		text: sanitizeText(arr?.[n]),
		textFont: toInt(arr?.[n + 1] ?? 0, 0, 2),
		textPerMode: toInt(arr?.[n + 2] ?? 0, 0, 1),
		modeTexts: [0, 1, 2, 3].map((g) => sanitizeText(arr?.[n + 3 + g])),
	};
	// "button name" from an earlier editor version is per-mode text with nothing overridden
	if (el.icon === ICON_NAME) Object.assign(el, { icon: ICON_TEXT, textPerMode: 1 });
	return el;
};
const toArray = (el) => [
	...FIELDS.map((field) => toInt(el[field])),
	sanitizeText(el.text),
	toInt(el.textFont ?? 0, 0, 2),
	el.textPerMode ? 1 : 0,
	...[0, 1, 2, 3].map((g) => sanitizeText(el.modeTexts?.[g])),
];

// default for buttons: their own text in every input mode, starting with the standard button names
const PER_MODE_TEXT = { icon: ICON_TEXT, textPerMode: 1 };

const fromLayoutElement = (item) => ({
	type: toInt(item.elementType),
	x1: toInt(item.parameters?.x1),
	y1: toInt(item.parameters?.y1),
	x2: toInt(item.parameters?.x2),
	y2: toInt(item.parameters?.y2),
	stroke: toInt(item.parameters?.stroke),
	fill: toInt(item.parameters?.fill),
	value: toInt(item.parameters?.value),
	shape: toInt(item.parameters?.shape),
	angleStart: toInt(item.parameters?.angleStart),
	angleEnd: toInt(item.parameters?.angleEnd),
	closed: toInt(item.parameters?.closed),
	icon: ICON_AUTO,
	text: '',
	textFont: 0,
	textPerMode: 0,
	modeTexts: ['', '', '', ''],
	...(BUTTON_TYPES.includes(toInt(item.elementType)) ? PER_MODE_TEXT : {}),
});

const isLever = (el) => el.type === GPElement.GP_ELEMENT_LEVER;
const isLabel = (el) => el.type === GPElement.GP_ELEMENT_LABEL;
const isButton = (el) => BUTTON_TYPES.includes(el.type);
// centred elements use x1/y1 as centre and x2 as radius; the others use x1/y1 -> x2/y2
const isCentered = (el) =>
	isLever(el) ||
	[
		GPShape_Type.GP_SHAPE_ELLIPSE,
		GPShape_Type.GP_SHAPE_POLYGON,
		GPShape_Type.GP_SHAPE_ARC,
	].includes(el.shape);

const movesByOrigin = (el) => isCentered(el) || isLabel(el);
const moveElement = (el, dx, dy) => {
	const single = movesByOrigin(el);
	const minX = single ? el.x1 : Math.min(el.x1, el.x2);
	const minY = single ? el.y1 : Math.min(el.y1, el.y2);
	const maxX = single ? el.x1 : Math.max(el.x1, el.x2);
	const maxY = single ? el.y1 : Math.max(el.y1, el.y2);
	const mx = Math.min(MAX_COORD - maxX, Math.max(-minX, dx));
	const my = Math.min(MAX_COORD - maxY, Math.max(-minY, dy));
	const next = { ...el, x1: el.x1 + mx, y1: el.y1 + my };
	if (!single) {
		next.x2 = el.x2 + mx;
		next.y2 = el.y2 + my;
	}
	return next;
};

// Same rules as GPButton::draw(): where the icon goes and whether it fits
const iconPlacement = (el) => {
	if (isCentered(el)) {
		if (el.shape === GPShape_Type.GP_SHAPE_ARC) return null;
		if (el.shape === GPShape_Type.GP_SHAPE_POLYGON && el.y2 < 6) return null;
		return { cx: el.x1, cy: el.y1, room: el.x2, availW: 2 * el.x2 - 1, availH: 2 * el.x2 - 1 };
	}
	if (el.shape === GPShape_Type.GP_SHAPE_LINE || el.angleStart !== 0) return null;
	return {
		cx: Math.floor((el.x1 + el.x2) / 2),
		cy: Math.floor((el.y1 + el.y2) / 2),
		room: Math.floor(Math.min(el.x2 - el.x1, el.y2 - el.y1) / 2),
		availW: el.x2 - el.x1 - 1,
		availH: el.y2 - el.y1 - 1,
	};
};

// font GPButton::draw() picks for button text (automatic: regular font with 1px clearance)
const buttonTextFont = (text, textFont, place) => {
	if (textFont === 1) return FONT_TINY;
	if (textFont === 2) return FONT_STANDARD;
	return textWidth(text, FONT_STANDARD) <= place.availW - 2 &&
		textHeight(FONT_STANDARD) <= place.availH - 2
		? FONT_STANDARD
		: FONT_TINY;
};

// Button names per input mode, must match headers/display/ui/elements/GPButtonIcons.h.
// Index 0..13 = B1 B2 B3 B4 L1 R1 L2 R2 S1 S2 L3 R3 A1 A2, 14..17 = up down left right.
const ARROWS = ['↑', '↓', '←', '→'];
const BUTTON_NAMES = {
	ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'SH', 'OP', 'L3', 'R3', 'PS', 'TP', ...ARROWS],
	ps3: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'SE', 'ST', 'L3', 'R3', 'PS', '', ...ARROWS],
	xinput: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BK', 'ST', 'LS', 'RS', 'XB', '', ...ARROWS],
	xbone: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VW', 'MN', 'LS', 'RS', 'XB', 'SH', ...ARROWS],
	nintendo: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '-', '+', 'LS', 'RS', 'HM', 'CP', ...ARROWS],
	hid: ['2', '3', '1', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', ...ARROWS],
	gp2040: ['B1', 'B2', 'B3', 'B4', 'L1', 'R1', 'L2', 'R2', 'S1', 'S2', 'L3', 'R3', 'A1', 'A2', ...ARROWS],
};
const NAME_FAMILY = {
	[InputMode.INPUT_MODE_PS4]: 'ps',
	[InputMode.INPUT_MODE_PS5]: 'ps',
	[InputMode.INPUT_MODE_P5GENERAL]: 'ps',
	[InputMode.INPUT_MODE_PS3]: 'ps3',
	[InputMode.INPUT_MODE_PSCLASSIC]: 'ps3',
	[InputMode.INPUT_MODE_XINPUT]: 'xinput',
	[InputMode.INPUT_MODE_XBOXORIGINAL]: 'xinput',
	[InputMode.INPUT_MODE_XBONE]: 'xbone',
	[InputMode.INPUT_MODE_SWITCH]: 'nintendo',
	[InputMode.INPUT_MODE_SWITCH_PRO]: 'nintendo',
	[InputMode.INPUT_MODE_GENERIC]: 'hid',
};
const NAME_ACTIONS = [
	'B1', 'B2', 'B3', 'B4', 'L1', 'R1', 'L2', 'R2', 'S1', 'S2', 'L3', 'R3', 'A1', 'A2',
	'UP', 'DOWN', 'LEFT', 'RIGHT',
].map((name) => GpioAction[`BUTTON_PRESS_${name}`]);

const buttonNameIndex = (el, pinActions) => {
	if (el.type === GPElement.GP_ELEMENT_BTN_BUTTON) {
		const index = BUTTON_MASKS.findIndex(([, mask]) => mask === el.value);
		return index < 14 ? index : -1;
	}
	if (el.type === GPElement.GP_ELEMENT_DIR_BUTTON) {
		const index = DPAD_MASKS.findIndex(([, mask]) => mask === el.value);
		return index < 0 ? -1 : 14 + index;
	}
	if (el.type === GPElement.GP_ELEMENT_PIN_BUTTON) return NAME_ACTIONS.indexOf(pinActions[el.value]);
	return -1;
};

const faceIcon = (inputMode, faceIndex) => {
	const family = MODE_FAMILY[inputMode];
	return family ? ICON_BY_ID[ICON_FAMILIES[family][faceIndex]] : null;
};

// standard name of a button in an input mode (what an empty per-mode text shows)
const standardName = (el, inputMode, pinActions) => {
	const index = buttonNameIndex(el, pinActions);
	return index < 0 ? '' : BUTTON_NAMES[NAME_FAMILY[inputMode] || 'gp2040'][index];
};

// What GPButton::draw() puts inside a button: { icon } or { text, font }, plus where
const resolveContent = (el, { buttonIcons, inputMode, pinActions }) => {
	if (!isButton(el) || el.icon === ICON_HIDDEN) return null;
	const place = iconPlacement(el);
	if (!place) return null;
	const withText = (text) =>
		text ? { place, text, font: buttonTextFont(text, el.textFont ?? 0, place) } : null;

	let showName = el.icon === ICON_NAME;
	if (el.icon === ICON_TEXT) {
		if (!el.textPerMode) return withText(el.text);
		const modeText = el.modeTexts?.[modeGroup(inputMode)];
		if (modeText) return withText(modeText);
		showName = true;
	}
	if (showName) {
		const index = buttonNameIndex(el, pinActions);
		if (index < 0) return null;
		const icon = index < 4 && place.room >= 4 ? faceIcon(inputMode, index) : null;
		if (icon) return { place, icon };
		return withText(BUTTON_NAMES[NAME_FAMILY[inputMode] || 'gp2040'][index]);
	}
	if (place.room < 4) return null;
	if (el.icon !== ICON_AUTO) return ICON_BY_ID[el.icon] ? { place, icon: ICON_BY_ID[el.icon] } : null;
	if (!buttonIcons) return null;
	let faceIndex = -1;
	if (el.type === GPElement.GP_ELEMENT_BTN_BUTTON) {
		faceIndex = [1, 2, 4, 8].indexOf(el.value);
	} else if (el.type === GPElement.GP_ELEMENT_PIN_BUTTON) {
		faceIndex = FACE_ACTIONS.indexOf(pinActions[el.value]);
	}
	const icon = faceIndex < 0 ? null : faceIcon(inputMode, faceIndex);
	return icon ? { place, icon } : null;
};

const arcPath = (cx, cy, r, startDeg, endDeg, closed) => {
	const span = endDeg - startDeg;
	if (span <= 0) return '';
	if (span >= 360) {
		return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
	}
	const rad = (d) => (d * Math.PI) / 180;
	const sx = cx + r * Math.cos(rad(startDeg));
	const sy = cy + r * Math.sin(rad(startDeg));
	const ex = cx + r * Math.cos(rad(endDeg));
	const ey = cy + r * Math.sin(rad(endDeg));
	const large = span > 180 ? 1 : 0;
	const arc = `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
	return closed ? `${arc} L ${cx} ${cy} Z` : arc;
};

const ElementShape = ({ el, color, filled }) => {
	const common = {
		stroke: el.stroke || isButton(el) || isLever(el) ? color : 'none',
		strokeWidth: 1,
		fill: filled ? color : 'transparent',
		pointerEvents: 'all',
	};

	if (isLever(el)) {
		return (
			<g>
				<circle cx={el.x1} cy={el.y1} r={el.x2} {...common} />
				<circle
					cx={el.x1}
					cy={el.y1}
					r={Math.floor(el.x2 * 0.75)}
					{...common}
					fill={color}
				/>
			</g>
		);
	}

	const cx = (el.x1 + el.x2) / 2;
	const cy = (el.y1 + el.y2) / 2;
	switch (el.shape) {
		case GPShape_Type.GP_SHAPE_ELLIPSE:
			return <circle cx={el.x1} cy={el.y1} r={el.x2} {...common} />;
		case GPShape_Type.GP_SHAPE_SQUARE:
			return (
				<rect
					x={Math.min(el.x1, el.x2)}
					y={Math.min(el.y1, el.y2)}
					width={Math.abs(el.x2 - el.x1)}
					height={Math.abs(el.y2 - el.y1)}
					transform={el.angleStart ? `rotate(${el.angleStart} ${cx} ${cy})` : undefined}
					{...common}
				/>
			);
		case GPShape_Type.GP_SHAPE_PILL: {
			const w = Math.abs(el.x2 - el.x1);
			const h = Math.abs(el.y2 - el.y1);
			return (
				<rect
					x={Math.min(el.x1, el.x2)}
					y={Math.min(el.y1, el.y2)}
					width={w}
					height={h}
					rx={Math.min(w, h) / 2}
					transform={el.angleStart ? `rotate(${el.angleStart} ${cx} ${cy})` : undefined}
					{...common}
				/>
			);
		}
		case GPShape_Type.GP_SHAPE_POLYGON: {
			const sides = Math.max(3, el.y2);
			// firmware treats the polygon rotation as radians
			const points = Array.from({ length: sides }, (_, i) => {
				const a = (i * 2 * Math.PI) / sides + el.angleStart;
				return `${el.x1 + Math.round(el.x2 * Math.cos(a))},${el.y1 + Math.round(el.x2 * Math.sin(a))}`;
			}).join(' ');
			return <polygon points={points} {...common} />;
		}
		case GPShape_Type.GP_SHAPE_ARC:
			return (
				<path
					d={arcPath(el.x1, el.y1, el.x2, el.angleStart, el.angleEnd, el.closed)}
					{...common}
					fill={filled && el.closed ? color : 'transparent'}
				/>
			);
		case GPShape_Type.GP_SHAPE_LINE:
			return (
				<line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} {...common} stroke={color} />
			);
		default:
			return (
				<rect
					x={el.x1}
					y={el.y1}
					width={Math.max(1, el.x2)}
					height={Math.max(1, el.y2)}
					{...common}
					strokeDasharray="1 1"
				/>
			);
	}
};

const IconPixels = ({ icon, cx, cy, color }) => (
	<g pointerEvents="none">
		{icon.glyph.flatMap((row, y) =>
			[0, 1, 2, 3, 4]
				.filter((x) => row & (1 << (4 - x)))
				.map((x) => (
					<rect
						key={`${x}-${y}`}
						x={cx - 2 + x}
						y={cy - 2 + y}
						width={1}
						height={1}
						fill={color}
					/>
				)),
		)}
	</g>
);

const TextPixels = ({ text, font, x, y, color }) => (
	<g pointerEvents="none">
		{textPixels(text, font).map(([px, py]) => (
			<rect key={`${px}-${py}`} x={x + px} y={y + py} width={1} height={1} fill={color} />
		))}
	</g>
);

const LabelElement = ({ el, color }) => {
	const font = el.value === FONT_STANDARD ? FONT_STANDARD : FONT_TINY;
	const w = Math.max(textWidth(el.text, font), 3);
	const h = textHeight(font);
	const ink = el.stroke ? color : '#000';
	return (
		<g>
			{/* hit area, also shows the solid background when enabled */}
			<rect
				x={el.x1 - 1}
				y={el.y1 - 1}
				width={w + 2}
				height={h + 2}
				fill={el.fill ? ink : 'transparent'}
				stroke={el.stroke ? 'none' : '#555'}
				strokeWidth={0.3}
				pointerEvents="all"
			/>
			<TextPixels
				text={el.text}
				font={font}
				x={el.x1}
				y={el.y1}
				color={el.fill ? (el.stroke ? '#000' : color) : ink}
			/>
		</g>
	);
};

const downloadJson = (data, filename) => {
	const blob = new Blob([JSON.stringify(data, null, 1)], {
		type: 'application/json',
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
};

export default function DisplayLayoutEditorPage() {
	const { t } = useTranslation('');
	const { setLoading } = useContext(AppContext);

	const [elements, setElements] = useState([]);
	const [selected, setSelected] = useState(-1);
	const [maxElements, setMaxElements] = useState(40);
	const [active, setActive] = useState(false);
	const [activate, setActivate] = useState(true);
	const [buttonIcons, setButtonIcons] = useState(true);
	const [inputMode, setInputMode] = useState(InputMode.INPUT_MODE_XINPUT);
	const [pinActions, setPinActions] = useState({});
	const [showGrid, setShowGrid] = useState(true);
	const [simulatePressed, setSimulatePressed] = useState(false);
	const [dirty, setDirty] = useState(false);
	const [message, setMessage] = useState(null);

	const svgRef = useRef(null);
	const dragRef = useRef(null);
	const fileRef = useRef(null);

	const messageTimer = useRef(null);
	const showMessage = (variant, text) => {
		setMessage({ variant, text });
		window.clearTimeout(messageTimer.current);
		messageTimer.current = window.setTimeout(() => setMessage(null), 5000);
	};

	const importCurrentLayout = useCallback(async () => {
		const data = await WebApi.getButtonLayouts();
		const layouts = data?.displayLayouts || {};
		const items = [
			...Object.values(layouts.buttonLayout || {}),
			...Object.values(layouts.buttonLayoutRight || {}),
		]
			.map(fromLayoutElement)
			.filter((el) => EDITABLE_TYPES.includes(el.type));
		return items;
	}, []);

	useEffect(() => {
		async function load() {
			setLoading(true);
			try {
				const [layout, displayOptions, gamepadOptions, pins] = await Promise.all([
					WebApi.getDisplayLayout(),
					WebApi.getDisplayOptions(),
					WebApi.getGamepadOptions(() => {}),
					WebApi.getPinMappings(),
				]);
				setMaxElements(layout?.maxElements || 40);
				setActive(Boolean(layout?.active));
				setButtonIcons(Boolean(displayOptions?.buttonIcons));
				if (gamepadOptions?.inputMode !== undefined) {
					setInputMode(parseInt(gamepadOptions.inputMode, 10));
				}
				setPinActions(
					Object.fromEntries(
						Object.entries(pins || {}).map(([key, value]) => [
							parseInt(key.replace('pin', ''), 10),
							value?.action,
						]),
					),
				);
				let items = (layout?.elements || []).map(fromArray);
				// first visit: start from whatever is on the screen now
				if (items.length === 0) items = await importCurrentLayout();
				setElements(items);
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const updateElements = (updater) => {
		setElements((prev) => updater(prev));
		setDirty(true);
	};

	const updateSelected = (patch) => {
		if (selected < 0) return;
		updateElements((prev) =>
			prev.map((el, i) => (i === selected ? { ...el, ...patch } : el)),
		);
	};

	// --- pointer dragging -------------------------------------------------
	const toScreen = (event) => {
		const svg = svgRef.current;
		const point = svg.createSVGPoint();
		point.x = event.clientX;
		point.y = event.clientY;
		const p = point.matrixTransform(svg.getScreenCTM().inverse());
		return { x: p.x, y: p.y };
	};

	const onElementPointerDown = (event, index) => {
		event.stopPropagation();
		setSelected(index);
		svgRef.current.focus();
		svgRef.current.setPointerCapture(event.pointerId);
		const p = toScreen(event);
		dragRef.current = { index, lastX: Math.round(p.x), lastY: Math.round(p.y) };
	};

	const onPointerMove = (event) => {
		const drag = dragRef.current;
		if (!drag) return;
		const p = toScreen(event);
		const x = Math.round(p.x);
		const y = Math.round(p.y);
		const dx = x - drag.lastX;
		const dy = y - drag.lastY;
		if (dx === 0 && dy === 0) return;
		drag.lastX = x;
		drag.lastY = y;
		updateElements((prev) =>
			prev.map((el, i) => (i === drag.index ? moveElement(el, dx, dy) : el)),
		);
	};

	const onPointerUp = () => {
		dragRef.current = null;
	};

	const onKeyDown = (event) => {
		if (selected < 0) return;
		const step = event.shiftKey ? 5 : 1;
		const moves = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step],
		};
		if (moves[event.key]) {
			event.preventDefault();
			const [dx, dy] = moves[event.key];
			updateElements((prev) =>
				prev.map((el, i) => (i === selected ? moveElement(el, dx, dy) : el)),
			);
		} else if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			removeSelected();
		}
	};

	// --- element list actions --------------------------------------------
	const addElement = (type) => {
		if (elements.length >= maxElements) return;
		const base = {
			type,
			x1: 64,
			y1: 32,
			x2: 4,
			y2: 4,
			stroke: 1,
			fill: 0,
			value: 0,
			shape: GPShape_Type.GP_SHAPE_ELLIPSE,
			angleStart: 0,
			angleEnd: 0,
			closed: 0,
			icon: ICON_AUTO,
			text: '',
			textFont: 0,
			textPerMode: 0,
			modeTexts: ['', '', '', ''],
			...(BUTTON_TYPES.includes(type) ? PER_MODE_TEXT : {}),
		};
		if (type === GPElement.GP_ELEMENT_LABEL) {
			Object.assign(base, { x1: 4, y1: 4, value: FONT_TINY, text: 'TEXT' });
		}
		if (type === GPElement.GP_ELEMENT_BTN_BUTTON) base.value = 1;
		if (type === GPElement.GP_ELEMENT_DIR_BUTTON) base.value = 1;
		if (type === GPElement.GP_ELEMENT_LEVER) base.x2 = 8;
		if (type === GPElement.GP_ELEMENT_SHAPE) {
			Object.assign(base, { shape: GPShape_Type.GP_SHAPE_SQUARE, x1: 56, y1: 24, x2: 72, y2: 40 });
		}
		updateElements((prev) => [...prev, base]);
		setSelected(elements.length);
	};

	const duplicateSelected = () => {
		if (selected < 0 || elements.length >= maxElements) return;
		updateElements((prev) => [...prev, moveElement({ ...prev[selected] }, 6, 0)]);
		setSelected(elements.length);
	};

	const removeSelected = () => {
		if (selected < 0) return;
		updateElements((prev) => prev.filter((_, i) => i !== selected));
		setSelected(-1);
	};

	const moveInList = (index, delta) => {
		const target = index + delta;
		if (target < 0 || target >= elements.length) return;
		updateElements((prev) => {
			const next = [...prev];
			[next[index], next[target]] = [next[target], next[index]];
			return next;
		});
		setSelected(target);
	};

	const onImportCurrent = async () => {
		if (dirty && !window.confirm(t('DisplayLayoutEditor:confirm-replace'))) return;
		setLoading(true);
		try {
			const items = await importCurrentLayout();
			setElements(items.slice(0, maxElements));
			setSelected(-1);
			setDirty(true);
			showMessage('info', t('DisplayLayoutEditor:imported-current', { count: items.length }));
		} finally {
			setLoading(false);
		}
	};

	const useNamesOnAllButtons = () => {
		updateElements((prev) => prev.map((el) => (isButton(el) ? { ...el, ...PER_MODE_TEXT } : el)));
		showMessage('info', t('DisplayLayoutEditor:names-applied'));
	};

	const onClear = () => {
		if (!window.confirm(t('DisplayLayoutEditor:confirm-clear'))) return;
		updateElements(() => []);
		setSelected(-1);
	};

	// --- device / file -----------------------------------------------------
	const send = async (isPreview) => {
		setLoading(true);
		try {
			const result = await WebApi.setDisplayLayout(
				// a preview always shows the edited layout; "activate" only matters when saving
				{ elements: elements.map(toArray), activate: isPreview || activate },
				isPreview,
			);
			if (!result) {
				showMessage('danger', t('DisplayLayoutEditor:send-failed'));
				return;
			}
			setActive(Boolean(result.active));
			if (!isPreview) setDirty(false);
			showMessage(
				'success',
				isPreview
					? t('DisplayLayoutEditor:preview-sent')
					: t('DisplayLayoutEditor:saved'),
			);
		} finally {
			setLoading(false);
		}
	};

	const onExport = () => {
		const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		downloadJson(
			{ version: FILE_VERSION, elements: elements.map(toArray) },
			`gp2040ce_display_layout_${date}.json`,
		);
	};

	const onImportFile = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		try {
			const data = JSON.parse(await file.text());
			const items = (data?.elements || [])
				.map((item) => (Array.isArray(item) ? fromArray(item) : fromLayoutElement(item)))
				.filter((el) => EDITABLE_TYPES.includes(el.type));
			setElements(items.slice(0, maxElements));
			setSelected(-1);
			setDirty(true);
			showMessage('info', t('DisplayLayoutEditor:imported-file', { count: items.length }));
		} catch (error) {
			showMessage('danger', t('DisplayLayoutEditor:import-failed', { error: error.message }));
		}
	};

	// --- rendering helpers -------------------------------------------------
	const iconContext = { buttonIcons, inputMode, pinActions };
	const selectedEl = selected >= 0 ? elements[selected] : null;

	const describe = (el) => {
		const type = t(`DisplayLayoutEditor:types.${el.type}`, { defaultValue: `#${el.type}` });
		if (el.type === GPElement.GP_ELEMENT_PIN_BUTTON) {
			const action = GPIO_ACTION_NAMES[pinActions[el.value]] || '';
			return `${type}: GP${el.value}${action ? ` (${action.replace('BUTTON_PRESS_', '')})` : ''}`;
		}
		if (el.type === GPElement.GP_ELEMENT_BTN_BUTTON) {
			const name = BUTTON_MASKS.find(([, mask]) => mask === el.value)?.[0];
			return `${type}: ${name || el.value}`;
		}
		if (el.type === GPElement.GP_ELEMENT_DIR_BUTTON) {
			const name = DPAD_MASKS.find(([, mask]) => mask === el.value)?.[0];
			return `${type}: ${name || el.value}`;
		}
		if (el.type === GPElement.GP_ELEMENT_SHAPE) {
			return `${type}: ${t(`DisplayLayoutEditor:shapes.${el.shape}`)}`;
		}
		if (isLabel(el)) return `${type}: "${el.text}"`;
		return type;
	};

	const numberField = (field, label, max = MAX_COORD) => (
		<Form.Group as={Col} xs={6} md={3} className="mb-2" key={field}>
			<Form.Label className="small mb-0">{label}</Form.Label>
			<Form.Control
				size="sm"
				type="number"
				min={0}
				max={max}
				value={selectedEl[field]}
				onChange={(e) => updateSelected({ [field]: toInt(e.target.value, 0, max) })}
			/>
		</Form.Group>
	);

	const geometryFields = (el) => {
		if (isLabel(el)) {
			return [
				numberField('x1', t('DisplayLayoutEditor:fields.left')),
				numberField('y1', t('DisplayLayoutEditor:fields.top')),
			];
		}
		if (isCentered(el)) {
			const fields = [
				numberField('x1', t('DisplayLayoutEditor:fields.center-x')),
				numberField('y1', t('DisplayLayoutEditor:fields.center-y')),
				numberField('x2', t('DisplayLayoutEditor:fields.radius')),
			];
			if (!isLever(el) && el.shape === GPShape_Type.GP_SHAPE_POLYGON) {
				fields.push(numberField('y2', t('DisplayLayoutEditor:fields.sides'), 16));
				fields.push(numberField('angleStart', t('DisplayLayoutEditor:fields.rotation-radians'), 6));
			}
			if (!isLever(el) && el.shape === GPShape_Type.GP_SHAPE_ARC) {
				fields.push(numberField('angleStart', t('DisplayLayoutEditor:fields.angle-start'), 720));
				fields.push(numberField('angleEnd', t('DisplayLayoutEditor:fields.angle-end'), 720));
			}
			return fields;
		}
		if (el.shape === GPShape_Type.GP_SHAPE_LINE) {
			return [
				numberField('x1', t('DisplayLayoutEditor:fields.start-x')),
				numberField('y1', t('DisplayLayoutEditor:fields.start-y')),
				numberField('x2', t('DisplayLayoutEditor:fields.end-x')),
				numberField('y2', t('DisplayLayoutEditor:fields.end-y')),
			];
		}
		return [
			numberField('x1', t('DisplayLayoutEditor:fields.left')),
			numberField('y1', t('DisplayLayoutEditor:fields.top')),
			numberField('x2', t('DisplayLayoutEditor:fields.right')),
			numberField('y2', t('DisplayLayoutEditor:fields.bottom')),
			numberField('angleStart', t('DisplayLayoutEditor:fields.rotation-degrees'), 359),
		];
	};

	const textInputRef = useRef(null);
	const insertSymbol = (symbol, binding) => {
		const input = textInputRef.current;
		const text = binding.value;
		// selection positions are UTF-16 offsets; all supported characters are single code units
		const start = input?.selectionStart ?? text.length;
		const end = input?.selectionEnd ?? text.length;
		const next = sanitizeText(text.slice(0, start) + symbol + text.slice(end));
		binding.set(next);
		window.requestAnimationFrame(() => {
			if (!input) return;
			input.focus();
			const caret = Math.min(start + 1, next.length);
			input.setSelectionRange(caret, caret);
		});
	};

	// binding: { value, set, label?, placeholder? }; defaults to the element's common text
	const textField = (
		el,
		binding = { value: el.text, set: (text) => updateSelected({ text }) },
		md = 6,
	) => (
		<Form.Group as={Col} xs={12} md={md} className="mb-2">
			<Form.Label className="small mb-0">
				{binding.label || t('DisplayLayoutEditor:fields.text')}
			</Form.Label>
			<Form.Control
				ref={textInputRef}
				size="sm"
				type="text"
				maxLength={TEXT_MAX_LENGTH}
				value={binding.value}
				placeholder={binding.placeholder}
				onChange={(e) => binding.set(sanitizeText(e.target.value))}
			/>
			<div className="d-flex flex-wrap gap-1 mt-1">
				{SYMBOLS.map((symbol) => (
					<Button
						key={symbol}
						size="sm"
						variant="outline-secondary"
						className="dle-symbol"
						title={t('DisplayLayoutEditor:insert-symbol')}
						disabled={binding.value.length >= TEXT_MAX_LENGTH}
						onClick={() => insertSymbol(symbol, binding)}
					>
						{symbol}
					</Button>
				))}
			</div>
		</Form.Group>
	);

	const setPreviewGroup = (index) => {
		if (modeGroup(inputMode) !== index) setInputMode(InputMode[MODE_GROUPS[index].preview]);
	};

	const buttonTextFields = (el) => {
		const allModes = !el.textPerMode;
		const group = modeGroup(inputMode);
		const groupName = (index) => t(`DisplayLayoutEditor:mode-groups.${MODE_GROUPS[index].key}`);
		const setModeText = (index, text) => {
			const modeTexts = [...(el.modeTexts || ['', '', '', ''])];
			modeTexts[index] = text;
			updateSelected({ modeTexts });
		};
		return (
			<>
				<Col xs={12} className="mb-2">
					<Form.Check
						type="switch"
						id="dle-all-modes"
						className="small"
						label={t('DisplayLayoutEditor:fields.all-modes')}
						checked={allModes}
						onChange={(e) => updateSelected({ textPerMode: e.target.checked ? 0 : 1 })}
					/>
				</Col>
				{allModes
					? textField(el)
					: textField(el, {
							value: el.modeTexts?.[group] || '',
							set: (text) => setModeText(group, text),
							label: t('DisplayLayoutEditor:fields.text-for', { group: groupName(group) }),
							placeholder: standardName(el, inputMode, pinActions),
						})}
				{!allModes && (
					<Col xs={12} className="mb-2 small">
						{MODE_GROUPS.map((g, index) => {
							const custom = el.modeTexts?.[index];
							const shown = custom || standardName(el, InputMode[g.preview], pinActions) || '-';
							return (
								<Button
									key={g.key}
									size="sm"
									variant={index === group ? 'secondary' : 'outline-secondary'}
									className="me-1 mb-1"
									title={t('DisplayLayoutEditor:edit-group')}
									onClick={() => setPreviewGroup(index)}
								>
									{`${groupName(index)}: ${shown}${custom ? ' *' : ''}`}
								</Button>
							);
						})}
					</Col>
				)}
			</>
		);
	};

	const valueField = (el) => {
		const select = (options) => (
			<Form.Group as={Col} xs={12} md={6} className="mb-2">
				<Form.Label className="small mb-0">{t('DisplayLayoutEditor:fields.input')}</Form.Label>
				<Form.Select
					size="sm"
					value={el.value}
					onChange={(e) => updateSelected({ value: toInt(e.target.value) })}
				>
					{options}
				</Form.Select>
			</Form.Group>
		);
		switch (el.type) {
			case GPElement.GP_ELEMENT_PIN_BUTTON:
				return select(
					Array.from({ length: 30 }, (_, pin) => (
						<option key={pin} value={pin}>
							{`GP${pin} - ${GPIO_ACTION_NAMES[pinActions[pin]] ?? '?'}`}
						</option>
					)),
				);
			case GPElement.GP_ELEMENT_BTN_BUTTON:
				return select(
					BUTTON_MASKS.map(([name, mask]) => (
						<option key={name} value={mask}>
							{name}
						</option>
					)),
				);
			case GPElement.GP_ELEMENT_DIR_BUTTON:
				return select(
					DPAD_MASKS.map(([name, mask]) => (
						<option key={name} value={mask}>
							{name}
						</option>
					)),
				);
			case GPElement.GP_ELEMENT_LEVER:
				return numberField('value', t('DisplayLayoutEditor:fields.lever-mode'), 255);
			case GPElement.GP_ELEMENT_LABEL:
				return (
					<>
						{textField(el)}
						<Form.Group as={Col} xs={12} md={6} className="mb-2">
							<Form.Label className="small mb-0">{t('DisplayLayoutEditor:fields.font')}</Form.Label>
							<Form.Select
								size="sm"
								value={el.value === FONT_STANDARD ? FONT_STANDARD : FONT_TINY}
								onChange={(e) => updateSelected({ value: toInt(e.target.value) })}
							>
								<option value={FONT_TINY}>{t('DisplayLayoutEditor:fonts.tiny')}</option>
								<option value={FONT_STANDARD}>{t('DisplayLayoutEditor:fonts.standard')}</option>
							</Form.Select>
						</Form.Group>
					</>
				);
			default:
				return null;
		}
	};

	const grid = useMemo(
		() => (
			<g pointerEvents="none" className="dle-grid">
				{Array.from({ length: SCREEN_WIDTH / 8 + 1 }, (_, i) => (
					<line key={`v${i}`} x1={i * 8} y1={0} x2={i * 8} y2={SCREEN_HEIGHT} />
				))}
				{Array.from({ length: SCREEN_HEIGHT / 8 + 1 }, (_, i) => (
					<line key={`h${i}`} x1={0} y1={i * 8} x2={SCREEN_WIDTH} y2={i * 8} />
				))}
			</g>
		),
		[],
	);

	return (
		<Section title={t('DisplayLayoutEditor:header-text')}>
			<p className="small text-muted">{t('DisplayLayoutEditor:sub-header-text')}</p>
			{!active && (
				<Alert variant="secondary" className="py-2 small">
					{t('DisplayLayoutEditor:inactive-note')}
				</Alert>
			)}
			{message && (
				<Alert variant={message.variant} className="py-2 small">
					{message.text}
				</Alert>
			)}

			<Row>
				<Col lg={8}>
					<div className="dle-screen-wrapper mb-2">
						<svg
							ref={svgRef}
							className="dle-screen"
							viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
							tabIndex={0}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
							onPointerCancel={onPointerUp}
							onPointerDown={() => setSelected(-1)}
							onKeyDown={onKeyDown}
						>
							<rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="#000" />
							{showGrid && grid}
							{elements.map((el, index) => {
								const isSelected = index === selected;
								const pressed = simulatePressed && isSelected && isButton(el);
								const color = isSelected ? '#4fc3f7' : '#fff';
								const filled =
									pressed || (el.type === GPElement.GP_ELEMENT_SHAPE && el.fill > 0);
								if (isLabel(el)) {
									return (
										<g
											key={index}
											className="dle-element"
											onPointerDown={(e) => onElementPointerDown(e, index)}
										>
											<LabelElement el={el} color={color} />
										</g>
									);
								}
								const content = resolveContent(el, iconContext);
								const ink = pressed ? '#000' : color;
								return (
									<g
										key={index}
										className="dle-element"
										onPointerDown={(e) => onElementPointerDown(e, index)}
									>
										<g transform="translate(0.5 0.5)">
											<ElementShape el={el} color={color} filled={filled} />
										</g>
										{content?.icon && (
											<IconPixels
												icon={content.icon}
												cx={content.place.cx}
												cy={content.place.cy}
												color={ink}
											/>
										)}
										{content?.text && (
											<TextPixels
												text={content.text}
												font={content.font}
												x={content.place.cx - Math.floor(textWidth(content.text, content.font) / 2)}
												y={content.place.cy - Math.floor(textHeight(content.font) / 2)}
												color={ink}
											/>
										)}
									</g>
								);
							})}
						</svg>
					</div>
					<div className="d-flex flex-wrap gap-3 align-items-center small mb-3">
						<Form.Check
							type="switch"
							id="dle-grid"
							label={t('DisplayLayoutEditor:show-grid')}
							checked={showGrid}
							onChange={(e) => setShowGrid(e.target.checked)}
						/>
						<Form.Check
							type="switch"
							id="dle-pressed"
							label={t('DisplayLayoutEditor:simulate-pressed')}
							checked={simulatePressed}
							onChange={(e) => setSimulatePressed(e.target.checked)}
						/>
						<Form.Check
							type="switch"
							id="dle-icons"
							label={t('DisplayLayoutEditor:auto-icons')}
							checked={buttonIcons}
							onChange={(e) => setButtonIcons(e.target.checked)}
						/>
						<Form.Group className="d-flex align-items-center gap-2">
							<Form.Label className="mb-0">{t('DisplayLayoutEditor:preview-mode')}</Form.Label>
							<Form.Select
								size="sm"
								style={{ width: 'auto' }}
								value={inputMode}
								onChange={(e) => setInputMode(toInt(e.target.value))}
							>
								{PREVIEW_MODES.map((name) => (
									<option key={name} value={InputMode[name]}>
										{name.replace('INPUT_MODE_', '')}
									</option>
								))}
							</Form.Select>
						</Form.Group>
					</div>
					<p className="small text-muted">{t('DisplayLayoutEditor:keyboard-hint')}</p>

					{selectedEl && (
						<div className="border rounded p-2 mb-3">
							<h6>{t('DisplayLayoutEditor:properties-header', { index: selected + 1 })}</h6>
							<Row>
								<Form.Group as={Col} xs={12} md={6} className="mb-2">
									<Form.Label className="small mb-0">{t('DisplayLayoutEditor:fields.type')}</Form.Label>
									<Form.Select
										size="sm"
										value={selectedEl.type}
										onChange={(e) => {
											const type = toInt(e.target.value);
											const patch = { type };
											if (type === GPElement.GP_ELEMENT_BTN_BUTTON || type === GPElement.GP_ELEMENT_DIR_BUTTON) patch.value = 1;
											if (type === GPElement.GP_ELEMENT_PIN_BUTTON || type === GPElement.GP_ELEMENT_LEVER) patch.value = 0;
											if (type === GPElement.GP_ELEMENT_LABEL) {
												Object.assign(patch, { value: FONT_TINY, stroke: 1, fill: 0, text: selectedEl.text || 'TEXT' });
											}
											updateSelected(patch);
										}}
									>
										{EDITABLE_TYPES.map((type) => (
											<option key={type} value={type}>
												{t(`DisplayLayoutEditor:types.${type}`)}
											</option>
										))}
									</Form.Select>
								</Form.Group>
								{!isLever(selectedEl) && !isLabel(selectedEl) && (
									<Form.Group as={Col} xs={12} md={6} className="mb-2">
										<Form.Label className="small mb-0">{t('DisplayLayoutEditor:fields.shape')}</Form.Label>
										<Form.Select
											size="sm"
											value={selectedEl.shape}
											onChange={(e) => {
												const shape = toInt(e.target.value);
												const wasCentered = isCentered(selectedEl);
												const next = { ...selectedEl, shape };
												// convert between centre/radius and corner coordinates
												if (wasCentered && !isCentered(next)) {
													const r = Math.max(2, selectedEl.x2);
													Object.assign(next, {
														x1: Math.max(0, selectedEl.x1 - r),
														y1: Math.max(0, selectedEl.y1 - r),
														x2: selectedEl.x1 + r,
														y2: selectedEl.y1 + r,
														angleStart: 0,
													});
												} else if (!wasCentered && isCentered(next)) {
													Object.assign(next, {
														x1: Math.floor((selectedEl.x1 + selectedEl.x2) / 2),
														y1: Math.floor((selectedEl.y1 + selectedEl.y2) / 2),
														x2: Math.max(2, Math.floor(Math.abs(selectedEl.x2 - selectedEl.x1) / 2)),
														y2: shape === GPShape_Type.GP_SHAPE_POLYGON ? 6 : 0,
														angleStart: 0,
														angleEnd: shape === GPShape_Type.GP_SHAPE_ARC ? 180 : 0,
													});
												}
												updateSelected(next);
											}}
										>
											{SHAPES.map((shape) => (
												<option key={shape} value={shape}>
													{t(`DisplayLayoutEditor:shapes.${shape}`)}
												</option>
											))}
										</Form.Select>
									</Form.Group>
								)}
								{valueField(selectedEl)}
								{isButton(selectedEl) && (
									<Form.Group as={Col} xs={12} md={6} className="mb-2">
										<Form.Label className="small mb-0">{t('DisplayLayoutEditor:fields.icon')}</Form.Label>
										<Form.Select
											size="sm"
											value={selectedEl.icon}
											onChange={(e) => {
												const icon = toInt(e.target.value, 0, 255);
												// switching to text starts with per-mode text unless the element already has one
												const patch = { icon };
												if (icon === ICON_TEXT && selectedEl.icon !== ICON_TEXT && !selectedEl.text) patch.textPerMode = 1;
												updateSelected(patch);
											}}
										>
											<option value={ICON_AUTO}>{t('DisplayLayoutEditor:icons.auto')}</option>
											<option value={ICON_HIDDEN}>{t('DisplayLayoutEditor:icons.hidden')}</option>
											<option value={ICON_TEXT}>{t('DisplayLayoutEditor:icons.text')}</option>
											{ICONS.map((icon) => (
												<option key={icon.id} value={icon.id}>
													{t(`DisplayLayoutEditor:icons.${icon.key}`, { defaultValue: icon.key })}
												</option>
											))}
										</Form.Select>
									</Form.Group>
								)}
								{isButton(selectedEl) && selectedEl.icon === ICON_TEXT && buttonTextFields(selectedEl)}
								{isButton(selectedEl) && selectedEl.icon === ICON_TEXT && (
									<Form.Group as={Col} xs={12} md={6} className="mb-2">
										<Form.Label className="small mb-0">{t('DisplayLayoutEditor:fields.font')}</Form.Label>
										<Form.Select
											size="sm"
											value={selectedEl.textFont ?? 0}
											onChange={(e) => updateSelected({ textFont: toInt(e.target.value, 0, 2) })}
										>
											<option value={0}>{t('DisplayLayoutEditor:fonts.auto')}</option>
											<option value={1}>{t('DisplayLayoutEditor:fonts.tiny')}</option>
											<option value={2}>{t('DisplayLayoutEditor:fonts.standard')}</option>
										</Form.Select>
									</Form.Group>
								)}
							</Row>
							<Row>{geometryFields(selectedEl)}</Row>
							<div className="d-flex flex-wrap gap-3 small">
								<Form.Check
									type="switch"
									id="dle-stroke"
									label={
										isLabel(selectedEl)
											? t('DisplayLayoutEditor:fields.white-text')
											: t('DisplayLayoutEditor:fields.outline')
									}
									checked={selectedEl.stroke > 0}
									onChange={(e) => updateSelected({ stroke: e.target.checked ? 1 : 0 })}
								/>
								{(selectedEl.type === GPElement.GP_ELEMENT_SHAPE || isLabel(selectedEl)) && (
									<Form.Check
										type="switch"
										id="dle-fill"
										label={
											isLabel(selectedEl)
												? t('DisplayLayoutEditor:fields.background')
												: t('DisplayLayoutEditor:fields.filled')
										}
										checked={selectedEl.fill > 0}
										onChange={(e) => updateSelected({ fill: e.target.checked ? 1 : 0 })}
									/>
								)}
								{!isLever(selectedEl) && selectedEl.shape === GPShape_Type.GP_SHAPE_ARC && (
									<Form.Check
										type="switch"
										id="dle-closed"
										label={t('DisplayLayoutEditor:fields.closed')}
										checked={selectedEl.closed > 0}
										onChange={(e) => updateSelected({ closed: e.target.checked ? 1 : 0 })}
									/>
								)}
							</div>
							{isButton(selectedEl) && iconPlacement(selectedEl)?.room < 4 && selectedEl.icon !== ICON_HIDDEN && selectedEl.icon !== ICON_TEXT && (
								<p className="small text-warning mt-2 mb-0">{t('DisplayLayoutEditor:icon-too-small')}</p>
							)}
							{((isButton(selectedEl) && selectedEl.icon === ICON_TEXT) || isLabel(selectedEl)) && (
								<p className="small text-muted mt-2 mb-0">{t('DisplayLayoutEditor:text-hint')}</p>
							)}
							{isButton(selectedEl) && selectedEl.icon === ICON_TEXT && selectedEl.textPerMode > 0 && (
								<p className="small text-muted mt-2 mb-0">{t('DisplayLayoutEditor:per-mode-hint')}</p>
							)}
						</div>
					)}
				</Col>

				<Col lg={4}>
					<div className="d-flex justify-content-between align-items-center mb-1">
						<strong className="small">
							{t('DisplayLayoutEditor:elements-header', { count: elements.length, max: maxElements })}
						</strong>
					</div>
					<ButtonGroup size="sm" className="mb-2 flex-wrap">
						{EDITABLE_TYPES.map((type) => (
							<Button
								key={type}
								variant="outline-primary"
								disabled={elements.length >= maxElements}
								onClick={() => addElement(type)}
							>
								{`+ ${t(`DisplayLayoutEditor:types.${type}`)}`}
							</Button>
						))}
					</ButtonGroup>
					<ListGroup className="dle-list mb-2">
						{elements.map((el, index) => (
							<ListGroup.Item
								key={index}
								as="div"
								role="button"
								action
								active={index === selected}
								className="d-flex justify-content-between align-items-center py-1 small"
								onClick={() => setSelected(index)}
							>
								<span>{`${index + 1}. ${describe(el)}`}</span>
								<span className="text-nowrap">
									<Button
										size="sm"
										variant="link"
										className="p-0 px-1"
										onClick={(e) => {
											e.stopPropagation();
											moveInList(index, -1);
										}}
									>
										↑
									</Button>
									<Button
										size="sm"
										variant="link"
										className="p-0 px-1"
										onClick={(e) => {
											e.stopPropagation();
											moveInList(index, 1);
										}}
									>
										↓
									</Button>
								</span>
							</ListGroup.Item>
						))}
					</ListGroup>
					<div className="d-flex flex-wrap gap-1 mb-3">
						<Button size="sm" variant="secondary" disabled={selected < 0 || elements.length >= maxElements} onClick={duplicateSelected}>
							{t('DisplayLayoutEditor:duplicate')}
						</Button>
						<Button size="sm" variant="danger" disabled={selected < 0} onClick={removeSelected}>
							{t('DisplayLayoutEditor:delete')}
						</Button>
						<Button
							size="sm"
							variant="outline-secondary"
							disabled={!elements.some(isButton)}
							onClick={useNamesOnAllButtons}
						>
							{t('DisplayLayoutEditor:names-all')}
						</Button>
						<Button size="sm" variant="outline-danger" disabled={elements.length === 0} onClick={onClear}>
							{t('DisplayLayoutEditor:clear')}
						</Button>
					</div>

					<div className="d-flex flex-wrap gap-1 mb-3">
						<Button size="sm" variant="outline-secondary" onClick={onImportCurrent}>
							{t('DisplayLayoutEditor:import-current')}
						</Button>
						<Button size="sm" variant="outline-secondary" onClick={onExport}>
							{t('DisplayLayoutEditor:export-file')}
						</Button>
						<Button size="sm" variant="outline-secondary" onClick={() => fileRef.current?.click()}>
							{t('DisplayLayoutEditor:import-file')}
						</Button>
						<input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImportFile} />
					</div>

					<Form.Check
						type="switch"
						id="dle-activate"
						className="small mb-2"
						label={t('DisplayLayoutEditor:activate')}
						checked={activate}
						onChange={(e) => setActivate(e.target.checked)}
					/>
					<div className="d-flex flex-wrap gap-1">
						<Button variant="outline-primary" onClick={() => send(true)}>
							{t('DisplayLayoutEditor:preview')}
						</Button>
						<Button variant="primary" onClick={() => send(false)}>
							{dirty ? t('DisplayLayoutEditor:save-dirty') : t('DisplayLayoutEditor:save')}
						</Button>
					</div>
					<p className="small text-muted mt-2">{t('DisplayLayoutEditor:preview-hint')}</p>
				</Col>
			</Row>
		</Section>
	);
}
