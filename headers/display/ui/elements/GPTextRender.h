#ifndef _GPTEXTRENDER_H_
#define _GPTEXTRENDER_H_

#include <stdint.h>
#include <string.h>
#include <string>
#include "GPGFX.h"
#include "fonts/GP_Font_Tiny.h"

// Pixel-positioned text for the button screen (the regular drawText only works on a character grid).
// Pixels outside the glyphs are left untouched, so text can be drawn on top of shapes.

#define GP_TEXT_MAX_LENGTH 16

// Symbols available in both fonts (font codes 0x80.., see GPGFX_core.h CHAR_*).
// Web Config exchanges them as UTF-8, the stored text keeps one byte per symbol.
typedef struct {
    uint8_t code;
    const char* utf8;
} GPTextSymbol;

static const GPTextSymbol GP_TEXT_SYMBOLS[] = {
    { 0x80, "\u25b3" }, // triangle
    { 0x81, "\u25cb" }, // circle
    { 0x82, "\u2715" }, // cross
    { 0x83, "\u25a1" }, // square
    { 0x84, "\u2191" }, // up
    { 0x85, "\u2193" }, // down
    { 0x86, "\u2190" }, // left
    { 0x87, "\u2192" }, // right
    { 0x88, "\u2196" }, // up-left
    { 0x89, "\u2197" }, // up-right
    { 0x8A, "\u2199" }, // down-left
    { 0x8B, "\u2198" }, // down-right
};
#define GP_TEXT_SYMBOL_COUNT (sizeof(GP_TEXT_SYMBOLS) / sizeof(GP_TEXT_SYMBOLS[0]))

// UTF-8 text from Web Config -> stored text (printable ASCII and symbol codes only)
static inline void gpTextFromUtf8(const char* in, char* out, size_t outSize) {
    size_t len = 0;
    while (*in && len + 1 < outSize) {
        uint8_t c = (uint8_t)*in;
        if (c >= 0x20 && c <= 0x7e) {
            out[len++] = (char)c;
            in++;
            continue;
        }
        bool matched = false;
        for (size_t s = 0; s < GP_TEXT_SYMBOL_COUNT; s++) {
            size_t n = strlen(GP_TEXT_SYMBOLS[s].utf8);
            if (strncmp(in, GP_TEXT_SYMBOLS[s].utf8, n) == 0) {
                out[len++] = (char)GP_TEXT_SYMBOLS[s].code;
                in += n;
                matched = true;
                break;
            }
        }
        if (!matched) in++; // drop anything the display fonts cannot show
    }
    out[len] = '\0';
}

// stored text -> UTF-8 for Web Config
static inline std::string gpTextToUtf8(const char* in) {
    std::string out;
    for (; *in; in++) {
        uint8_t c = (uint8_t)*in;
        if (c >= 0x20 && c <= 0x7e) {
            out += (char)c;
        } else {
            for (size_t s = 0; s < GP_TEXT_SYMBOL_COUNT; s++) {
                if (GP_TEXT_SYMBOLS[s].code == c) { out += GP_TEXT_SYMBOLS[s].utf8; break; }
            }
        }
    }
    return out;
}

typedef enum {
    GP_TEXT_FONT_TINY = 0,     // 3x5, uppercase
    GP_TEXT_FONT_STANDARD = 1, // 5x7, the display's regular font
} GPTextFont;

static inline uint8_t gpTextAdvance(GPTextFont font) { return font == GP_TEXT_FONT_STANDARD ? 6 : 4; }
static inline uint8_t gpTextHeight(GPTextFont font) { return font == GP_TEXT_FONT_STANDARD ? 7 : 5; }

static inline uint16_t gpTextWidth(const char* text, GPTextFont font) {
    size_t len = strnlen(text, GP_TEXT_MAX_LENGTH);
    return len == 0 ? 0 : (uint16_t)(len * gpTextAdvance(font) - 1);
}

static inline void gpDrawText(GPGFX* renderer, int32_t x, int32_t y, const char* text, GPTextFont font, uint32_t color) {
    const size_t standardGlyphs = sizeof(GP_Font_Standard) / 5;
    size_t len = strnlen(text, GP_TEXT_MAX_LENGTH);
    for (size_t i = 0; i < len; i++) {
        uint8_t c = (uint8_t)text[i];
        int32_t originX = x + (int32_t)(i * gpTextAdvance(font));

        if (font == GP_TEXT_FONT_STANDARD) {
            if (c < GPGFX_FONT_CHAR_OFFSET || (size_t)(c - GPGFX_FONT_CHAR_OFFSET) >= standardGlyphs) c = '?';
            const uint8_t* glyph = &GP_Font_Standard[(c - GPGFX_FONT_CHAR_OFFSET) * 5];
            for (uint8_t col = 0; col < 5; col++) {
                for (uint8_t row = 0; row < 7; row++) {
                    if ((glyph[col] >> row) & 0x01) {
                        int32_t px = originX + col, py = y + row;
                        if (px >= 0 && py >= 0) renderer->drawPixel((uint16_t)px, (uint16_t)py, color);
                    }
                }
            }
        } else {
            if (c >= 'a' && c <= 'z') c = c - 'a' + 'A';
            uint16_t glyph;
            if (c >= GP_FONT_TINY_SYMBOLS_FIRST && c < GP_FONT_TINY_SYMBOLS_FIRST + GP_FONT_TINY_SYMBOLS_COUNT) {
                glyph = GP_Font_Tiny_Symbols[c - GP_FONT_TINY_SYMBOLS_FIRST];
            } else {
                if (c < GP_FONT_TINY_FIRST || c >= GP_FONT_TINY_FIRST + GP_FONT_TINY_COUNT) c = '?';
                glyph = GP_Font_Tiny[c - GP_FONT_TINY_FIRST];
            }
            for (uint8_t row = 0; row < 5; row++) {
                uint8_t bits = (glyph >> ((4 - row) * 3)) & 0x07;
                for (uint8_t col = 0; col < 3; col++) {
                    if (bits & (0x04 >> col)) {
                        int32_t px = originX + col, py = y + row;
                        if (px >= 0 && py >= 0) renderer->drawPixel((uint16_t)px, (uint16_t)py, color);
                    }
                }
            }
        }
    }
}

#endif
