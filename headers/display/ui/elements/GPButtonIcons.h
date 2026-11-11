#ifndef _GPBUTTONICONS_H_
#define _GPBUTTONICONS_H_

#include <stdint.h>
#include "enums.pb.h"

// 5x5 monochrome glyphs drawn in the centre of face buttons.
// One byte per row, bit 4 is the leftmost pixel.
#define GP_BUTTON_ICON_SIZE 5
#define GP_BUTTON_ICON_AUTO 0
#define GP_BUTTON_ICON_NAME 253 // button name for the current input mode
#define GP_BUTTON_ICON_TEXT 254
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

// Button names per input mode, for GP_BUTTON_ICON_NAME.
// Index 0..13 = B1 B2 B3 B4 L1 R1 L2 R2 S1 S2 L3 R3 A1 A2 (bit order of the gamepad mask), 14..17 = up down left right.
// \x80..\x87 are the display font's triangle/circle/cross/square and arrows.
#define GP_BUTTON_NAME_BUTTONS 14
#define GP_BUTTON_NAME_UP      14
#define GP_BUTTON_NAME_DOWN    15
#define GP_BUTTON_NAME_LEFT    16
#define GP_BUTTON_NAME_RIGHT   17
#define GP_BUTTON_NAME_COUNT   18

static const char* const GP_BUTTON_NAMES_PS[GP_BUTTON_NAME_COUNT] = {
    "\x82", "\x81", "\x83", "\x80", "L1", "R1", "L2", "R2", "SH", "OP", "L3", "R3", "PS", "TP", "\x84", "\x85", "\x86", "\x87" };
static const char* const GP_BUTTON_NAMES_PS3[GP_BUTTON_NAME_COUNT] = {
    "\x82", "\x81", "\x83", "\x80", "L1", "R1", "L2", "R2", "SE", "ST", "L3", "R3", "PS", "", "\x84", "\x85", "\x86", "\x87" };
static const char* const GP_BUTTON_NAMES_XINPUT[GP_BUTTON_NAME_COUNT] = {
    "A", "B", "X", "Y", "LB", "RB", "LT", "RT", "BK", "ST", "LS", "RS", "XB", "", "\x84", "\x85", "\x86", "\x87" };
static const char* const GP_BUTTON_NAMES_XBONE[GP_BUTTON_NAME_COUNT] = {
    "A", "B", "X", "Y", "LB", "RB", "LT", "RT", "VW", "MN", "LS", "RS", "XB", "SH", "\x84", "\x85", "\x86", "\x87" };
static const char* const GP_BUTTON_NAMES_NINTENDO[GP_BUTTON_NAME_COUNT] = {
    "B", "A", "Y", "X", "L", "R", "ZL", "ZR", "-", "+", "LS", "RS", "HM", "CP", "\x84", "\x85", "\x86", "\x87" };
static const char* const GP_BUTTON_NAMES_HID[GP_BUTTON_NAME_COUNT] = {
    "2", "3", "1", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "\x84", "\x85", "\x86", "\x87" };
static const char* const GP_BUTTON_NAMES_GP2040[GP_BUTTON_NAME_COUNT] = {
    "B1", "B2", "B3", "B4", "L1", "R1", "L2", "R2", "S1", "S2", "L3", "R3", "A1", "A2", "\x84", "\x85", "\x86", "\x87" };

static inline const char* getButtonNameForMode(InputMode mode, uint8_t index) {
    if (index >= GP_BUTTON_NAME_COUNT) return "";
    switch (mode) {
        case INPUT_MODE_PS4:
        case INPUT_MODE_PS5:
        case INPUT_MODE_P5GENERAL:
            return GP_BUTTON_NAMES_PS[index];
        case INPUT_MODE_PS3:
        case INPUT_MODE_PSCLASSIC:
            return GP_BUTTON_NAMES_PS3[index];
        case INPUT_MODE_XINPUT:
        case INPUT_MODE_XBOXORIGINAL:
            return GP_BUTTON_NAMES_XINPUT[index];
        case INPUT_MODE_XBONE:
            return GP_BUTTON_NAMES_XBONE[index];
        case INPUT_MODE_SWITCH:
        case INPUT_MODE_SWITCH_PRO:
            return GP_BUTTON_NAMES_NINTENDO[index];
        case INPUT_MODE_GENERIC:
            return GP_BUTTON_NAMES_HID[index];
        default:
            return GP_BUTTON_NAMES_GP2040[index];
    }
}

static inline int8_t buttonNameIndexFromAction(GpioAction action) {
    switch (action) {
        case GpioAction::BUTTON_PRESS_B1: return 0;
        case GpioAction::BUTTON_PRESS_B2: return 1;
        case GpioAction::BUTTON_PRESS_B3: return 2;
        case GpioAction::BUTTON_PRESS_B4: return 3;
        case GpioAction::BUTTON_PRESS_L1: return 4;
        case GpioAction::BUTTON_PRESS_R1: return 5;
        case GpioAction::BUTTON_PRESS_L2: return 6;
        case GpioAction::BUTTON_PRESS_R2: return 7;
        case GpioAction::BUTTON_PRESS_S1: return 8;
        case GpioAction::BUTTON_PRESS_S2: return 9;
        case GpioAction::BUTTON_PRESS_L3: return 10;
        case GpioAction::BUTTON_PRESS_R3: return 11;
        case GpioAction::BUTTON_PRESS_A1: return 12;
        case GpioAction::BUTTON_PRESS_A2: return 13;
        case GpioAction::BUTTON_PRESS_UP: return GP_BUTTON_NAME_UP;
        case GpioAction::BUTTON_PRESS_DOWN: return GP_BUTTON_NAME_DOWN;
        case GpioAction::BUTTON_PRESS_LEFT: return GP_BUTTON_NAME_LEFT;
        case GpioAction::BUTTON_PRESS_RIGHT: return GP_BUTTON_NAME_RIGHT;
        default: return -1;
    }
}

#endif
