#ifndef _GPTEXTRENDER_H_
#define _GPTEXTRENDER_H_

#include <stdint.h>
#include <string.h>
#include "GPGFX.h"
#include "fonts/GP_Font_Tiny.h"

// Pixel-positioned text for the button screen (the regular drawText only works on a character grid).
// Pixels outside the glyphs are left untouched, so text can be drawn on top of shapes.

#define GP_TEXT_MAX_LENGTH 16

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
            if (c < GP_FONT_TINY_FIRST || c >= GP_FONT_TINY_FIRST + GP_FONT_TINY_COUNT) c = '?';
            uint16_t glyph = GP_Font_Tiny[c - GP_FONT_TINY_FIRST];
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
