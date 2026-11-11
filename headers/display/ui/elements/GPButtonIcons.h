#ifndef _GPBUTTONICONS_H_
#define _GPBUTTONICONS_H_

#include <stdint.h>
#include "enums.pb.h"

// 5x5 monochrome glyphs drawn in the centre of face buttons.
// One byte per row, bit 4 is the leftmost pixel.
#define GP_BUTTON_ICON_SIZE 5
#define GP_BUTTON_ICON_AUTO 0
#define GP_BUTTON_ICON_HIDDEN 255

typedef enum {
    GP_ICON_NONE = 0,
    GP_ICON_PS_CROSS,
    GP_ICON_PS_CIRCLE,
    GP_ICON_PS_SQUARE,
    GP_ICON_PS_TRIANGLE,
    GP_ICON_LETTER_A,
    GP_ICON_LETTER_B,
    GP_ICON_LETTER_X,
    GP_ICON_LETTER_Y,
    GP_ICON_DIGIT_1,
    GP_ICON_DIGIT_2,
    GP_ICON_DIGIT_3,
    GP_ICON_DIGIT_4,
    GP_ICON_COUNT
} GPButtonIcon;

static const uint8_t GP_BUTTON_ICON_GLYPHS[GP_ICON_COUNT][GP_BUTTON_ICON_SIZE] = {
    { 0x00, 0x00, 0x00, 0x00, 0x00 }, // none
    { 0x11, 0x0A, 0x04, 0x0A, 0x11 }, // cross
    { 0x0E, 0x11, 0x11, 0x11, 0x0E }, // circle
    { 0x1F, 0x11, 0x11, 0x11, 0x1F }, // square
    { 0x04, 0x0A, 0x0A, 0x11, 0x1F }, // triangle
    { 0x0E, 0x11, 0x1F, 0x11, 0x11 }, // A
    { 0x1E, 0x11, 0x1E, 0x11, 0x1E }, // B
    { 0x11, 0x0A, 0x04, 0x0A, 0x11 }, // X
    { 0x11, 0x0A, 0x04, 0x04, 0x04 }, // Y
    { 0x04, 0x0C, 0x04, 0x04, 0x0E }, // 1
    { 0x1E, 0x01, 0x0E, 0x10, 0x1F }, // 2
    { 0x1E, 0x01, 0x06, 0x01, 0x1E }, // 3
    { 0x12, 0x12, 0x1F, 0x02, 0x02 }, // 4
};

// faceIndex: 0 = B1, 1 = B2, 2 = B3, 3 = B4
static inline GPButtonIcon getButtonIconForMode(InputMode mode, uint8_t faceIndex) {
    static const GPButtonIcon ps[4]       = { GP_ICON_PS_CROSS, GP_ICON_PS_CIRCLE, GP_ICON_PS_SQUARE, GP_ICON_PS_TRIANGLE };
    static const GPButtonIcon xbox[4]     = { GP_ICON_LETTER_A, GP_ICON_LETTER_B, GP_ICON_LETTER_X, GP_ICON_LETTER_Y };
    static const GPButtonIcon nintendo[4] = { GP_ICON_LETTER_B, GP_ICON_LETTER_A, GP_ICON_LETTER_Y, GP_ICON_LETTER_X };
    static const GPButtonIcon hid[4]      = { GP_ICON_DIGIT_2, GP_ICON_DIGIT_3, GP_ICON_DIGIT_1, GP_ICON_DIGIT_4 };

    if (faceIndex > 3) return GP_ICON_NONE;

    switch (mode) {
        case INPUT_MODE_PS3:
        case INPUT_MODE_PS4:
        case INPUT_MODE_PS5:
        case INPUT_MODE_P5GENERAL:
        case INPUT_MODE_PSCLASSIC:
            return ps[faceIndex];
        case INPUT_MODE_XINPUT:
        case INPUT_MODE_XBONE:
        case INPUT_MODE_XBOXORIGINAL:
            return xbox[faceIndex];
        case INPUT_MODE_SWITCH:
        case INPUT_MODE_SWITCH_PRO:
            return nintendo[faceIndex];
        case INPUT_MODE_GENERIC:
            return hid[faceIndex];
        default:
            return GP_ICON_NONE;
    }
}

#endif
