#include "GPButton.h"
#include "GPGFX_UI_layouts.h"
#include "GPButtonIcons.h"
#include "GPTextRender.h"

#include <algorithm>

// Returns 0..3 for B1..B4, or -1 if this button is not a face button.
static int8_t faceIndexFromMask(uint32_t mask) {
    switch (mask) {
        case GAMEPAD_MASK_B1: return 0;
        case GAMEPAD_MASK_B2: return 1;
        case GAMEPAD_MASK_B3: return 2;
        case GAMEPAD_MASK_B4: return 3;
        default: return -1;
    }
}

static int8_t faceIndexFromAction(GpioAction action) {
    switch (action) {
        case GpioAction::BUTTON_PRESS_B1: return 0;
        case GpioAction::BUTTON_PRESS_B2: return 1;
        case GpioAction::BUTTON_PRESS_B3: return 2;
        case GpioAction::BUTTON_PRESS_B4: return 3;
        default: return -1;
    }
}

void GPButton::draw() {
    // new style button:
    uint16_t baseX = this->x;
    uint16_t baseY = this->y;
    Mask_t pinValues = ~gpio_get_all();

    // scale to viewport
    double scaleX = this->getScaleX();
    double scaleY = this->getScaleY();

    // set scale on X & Y to be proportionate if either is 0
    if ((scaleX > 0.0f) & ((scaleY == 0.0f) || (scaleY == 1.0f))) {
        scaleY = scaleX;
    } else if (((scaleX == 0.0f) || (scaleX == 1.0f)) & (scaleY > 0.0f)) {
        scaleX = scaleY;
    }

    uint16_t offsetX = ((getRenderer()->getDriver()->getMetrics()->width - (uint16_t)((double)(this->getViewport().right - this->getViewport().left) * scaleX)) / 2);
    uint16_t offsetY = ((getRenderer()->getDriver()->getMetrics()->height - (uint16_t)((double)(this->getViewport().bottom - this->getViewport().top) * scaleY)) / 2);

    if (scaleX > 0.0f) {
        baseX = ((this->x) * scaleX + this->getViewport().left) + offsetX;
    }

    if (scaleY > 0.0f) {
        baseY = ((this->y) * scaleY + this->getViewport().top);
    }

    bool pinState = false;
    bool buttonState = false;
    bool turboState = false;
    uint16_t state = 0;
    int16_t setPin = -1;
    int32_t maskedPins = 0;
    bool useMask = false;
    GamepadButtonMapping *mapMask = NULL;
    GpioMappingInfo* pinMappings = Storage::getInstance().getProfilePinMappings();

    if (_inputType == GP_ELEMENT_BTN_BUTTON) {
        // button mask
        buttonState = getProcessedGamepad()->pressedButton(this->_inputMask);
        useMask = true;

        if ((this->_inputMask & GAMEPAD_MASK_B1) == GAMEPAD_MASK_B1) {
            mapMask = getGamepad()->mapButtonB1;
        } else if ((this->_inputMask & GAMEPAD_MASK_B2) == GAMEPAD_MASK_B2) {
            mapMask = getGamepad()->mapButtonB2;
        } else if ((this->_inputMask & GAMEPAD_MASK_B3) == GAMEPAD_MASK_B3) {
            mapMask = getGamepad()->mapButtonB3;
        } else if ((this->_inputMask & GAMEPAD_MASK_B4) == GAMEPAD_MASK_B4) {
            mapMask = getGamepad()->mapButtonB4;
        } else if ((this->_inputMask & GAMEPAD_MASK_L1) == GAMEPAD_MASK_L1) {
            mapMask = getGamepad()->mapButtonL1;
        } else if ((this->_inputMask & GAMEPAD_MASK_R1) == GAMEPAD_MASK_R1) {
            mapMask = getGamepad()->mapButtonR1;
        } else if ((this->_inputMask & GAMEPAD_MASK_L2) == GAMEPAD_MASK_L2) {
            mapMask = getGamepad()->mapButtonL2;
        } else if ((this->_inputMask & GAMEPAD_MASK_R2) == GAMEPAD_MASK_R2) {
            mapMask = getGamepad()->mapButtonR2;
        } else if ((this->_inputMask & GAMEPAD_MASK_S1) == GAMEPAD_MASK_S1) {
            mapMask = getGamepad()->mapButtonS1;
        } else if ((this->_inputMask & GAMEPAD_MASK_S2) == GAMEPAD_MASK_S2) {
            mapMask = getGamepad()->mapButtonS2;
        } else if ((this->_inputMask & GAMEPAD_MASK_L3) == GAMEPAD_MASK_L3) {
            mapMask = getGamepad()->mapButtonL3;
        } else if ((this->_inputMask & GAMEPAD_MASK_R3) == GAMEPAD_MASK_R3) {
            mapMask = getGamepad()->mapButtonR3;
        } else if ((this->_inputMask & GAMEPAD_MASK_A1) == GAMEPAD_MASK_A1) {
            mapMask = getGamepad()->mapButtonA1;
        } else if ((this->_inputMask & GAMEPAD_MASK_A2) == GAMEPAD_MASK_A2) {
            mapMask = getGamepad()->mapButtonA2;
        }
        turboState = (getGamepad()->turboState.buttons & this->_inputMask);
    } else if (_inputType == GP_ELEMENT_DIR_BUTTON) {
        // direction button mask
        buttonState = getProcessedGamepad()->pressedDpad(this->_inputMask);
        useMask = true;

        if ((this->_inputMask & GAMEPAD_MASK_UP) == GAMEPAD_MASK_UP) {
            mapMask = getGamepad()->mapDpadUp;
        } else if ((this->_inputMask & GAMEPAD_MASK_DOWN) == GAMEPAD_MASK_DOWN) {
            mapMask = getGamepad()->mapDpadDown;
        } else if ((this->_inputMask & GAMEPAD_MASK_LEFT) == GAMEPAD_MASK_LEFT) {
            mapMask = getGamepad()->mapDpadLeft;
        } else if ((this->_inputMask & GAMEPAD_MASK_RIGHT) == GAMEPAD_MASK_RIGHT) {
            mapMask = getGamepad()->mapDpadRight;
        }
    } else if (_inputType == GP_ELEMENT_PIN_BUTTON) {
        // physical pin
        pinState = ((pinValues >> this->_inputMask) & 0x01);
        buttonState = true;

        switch (pinMappings[this->_inputMask].action) {
            case GpioAction::BUTTON_PRESS_B1: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_B1); break;
            case GpioAction::BUTTON_PRESS_B2: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_B2); break;
            case GpioAction::BUTTON_PRESS_B3: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_B3); break;
            case GpioAction::BUTTON_PRESS_B4: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_B4); break;
            case GpioAction::BUTTON_PRESS_L1: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_L1); break;
            case GpioAction::BUTTON_PRESS_R1: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_R1); break;
            case GpioAction::BUTTON_PRESS_L2: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_L2); break;
            case GpioAction::BUTTON_PRESS_R2: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_R2); break;
            case GpioAction::BUTTON_PRESS_S1: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_S1); break;
            case GpioAction::BUTTON_PRESS_S2: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_S2); break;
            case GpioAction::BUTTON_PRESS_A1: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_A1); break;
            case GpioAction::BUTTON_PRESS_A2: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_A2); break;
            case GpioAction::BUTTON_PRESS_L3: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_L3); break;
            case GpioAction::BUTTON_PRESS_R3: turboState |= (getGamepad()->turboState.buttons & GAMEPAD_MASK_R3); break;
            default: break;
        }
    }

    if (useMask && mapMask != NULL) {
        maskedPins = (pinValues & mapMask->pinMask);
        for (Pin_t pin = 0; pin < (Pin_t)NUM_BANK0_GPIOS; pin++) {
            if ((maskedPins & (1 << pin)) == (1 << pin)) {
                setPin = pin;
                break;
            }
        }

        if (setPin > -1) {
            pinState = ((pinValues >> setPin) & 0x01);
        }
    }

    state = (buttonState ? pinState : 0);

    // centre and inner half-size of the shape, used for the mode icon
    int32_t iconCenterX = -1;
    int32_t iconCenterY = -1;
    int32_t iconRoom = 0;
    // inner area available for text
    int32_t textAvailW = 0;
    int32_t textAvailH = 0;

    // base
    if (this->_shape == GP_SHAPE_ELLIPSE) {
        uint16_t scaledSize = (uint16_t)((double)this->_sizeX * scaleX);
        uint16_t baseRadius = (uint16_t)scaledSize;
        uint16_t turboRadius = (uint16_t)scaledSize * GP_BUTTON_TURBO_SCALE;

        getRenderer()->drawEllipse(baseX, baseY, baseRadius, baseRadius, this->strokeColor, state);
        if (turboState) getRenderer()->drawEllipse(baseX, baseY, turboRadius, turboRadius, 1, 0);
        iconCenterX = baseX;
        iconCenterY = baseY;
        iconRoom = baseRadius;
        textAvailW = textAvailH = 2 * (int32_t)baseRadius - 1;
    } else if (this->_shape == GP_SHAPE_SQUARE) {
        uint16_t sizeX = (this->_sizeX) * scaleX + this->getViewport().left;
        uint16_t sizeY = (this->_sizeY) * scaleY + this->getViewport().top;
        uint16_t width = sizeX - baseX;
        uint16_t height = sizeY - baseY;
        uint16_t turboW = (uint16_t)round(width * GP_BUTTON_TURBO_SCALE);
        uint16_t turboH = (uint16_t)round(height * GP_BUTTON_TURBO_SCALE);
        uint16_t turboX = baseX + (width - turboW) / 2;
        uint16_t turboY = baseY + (height - turboH) / 2;

        getRenderer()->drawRectangle(baseX, baseY, sizeX+offsetX, sizeY, this->strokeColor, state, this->_angle);
        if (turboState) getRenderer()->drawRectangle(turboX, turboY, turboX+turboW, turboY+turboH, 1, 0, this->_angle);
        if (this->_angle == 0) {
            iconCenterX = ((int32_t)baseX + (int32_t)(sizeX + offsetX)) / 2;
            iconCenterY = ((int32_t)baseY + (int32_t)sizeY) / 2;
            iconRoom = std::min((int32_t)(sizeX + offsetX) - (int32_t)baseX, (int32_t)sizeY - (int32_t)baseY) / 2;
            textAvailW = (int32_t)(sizeX + offsetX) - (int32_t)baseX - 1;
            textAvailH = (int32_t)sizeY - (int32_t)baseY - 1;
        }
    } else if (this->_shape == GP_SHAPE_LINE) {
        getRenderer()->drawLine(baseX, baseY, this->_sizeX, this->_sizeY, this->strokeColor, 0);
    } else if (this->_shape == GP_SHAPE_POLYGON) {
        uint16_t scaledSize = (uint16_t)((double)this->_sizeX * scaleX);
        uint16_t baseRadius = (uint16_t)scaledSize;
        uint16_t turboRadius = (uint16_t)scaledSize * GP_BUTTON_TURBO_SCALE;

        getRenderer()->drawPolygon(baseX, baseY, baseRadius, this->_sizeY, this->strokeColor, state, this->_angle);
        if (turboState) getRenderer()->drawPolygon(baseX, baseY, turboRadius, this->_sizeY, 1, 0, this->_angle);
        if (this->_sizeY >= 6) { // hexagons and rounder shapes have enough room
            iconCenterX = baseX;
            iconCenterY = baseY;
            iconRoom = baseRadius;
            textAvailW = textAvailH = 2 * (int32_t)baseRadius - 1;
        }
    } else if (this->_shape == GP_SHAPE_ARC) {
        uint16_t scaledSize = (uint16_t)((double)this->_sizeX * scaleX);
        uint16_t baseRadius = (uint16_t)scaledSize;
        uint16_t turboRadius = (uint16_t)scaledSize * GP_BUTTON_TURBO_SCALE;

        getRenderer()->drawArc(baseX, baseY, baseRadius, baseRadius, this->strokeColor, state, this->_angle, this->_angleEnd, this->_closed);
        if (turboState) getRenderer()->drawArc(baseX, baseY, turboRadius, turboRadius, 1, 0, this->_angle, this->_angleEnd, this->_closed);
    } else if (this->_shape == GP_SHAPE_PILL) {
        uint16_t sizeX = (this->_sizeX) * scaleX + this->getViewport().left;
        uint16_t sizeY = (this->_sizeY) * scaleY + this->getViewport().top;
        uint16_t width = sizeX - baseX;
        uint16_t height = sizeY - baseY;
        uint16_t turboW = (uint16_t)round(width * GP_BUTTON_TURBO_SCALE);
        uint16_t turboH = (uint16_t)round(height * GP_BUTTON_TURBO_SCALE);
        uint16_t turboX = baseX + (width - turboW) / 2;
        uint16_t turboY = baseY + (height - turboH) / 2;

        getRenderer()->drawPill(baseX, baseY, sizeX+offsetX, sizeY, this->strokeColor, state, this->_angle);
        if (turboState) getRenderer()->drawPill(turboX, turboY, turboX+turboW, turboY+turboH, 1, 0, this->_angle);
        if (this->_angle == 0) {
            iconCenterX = ((int32_t)baseX + (int32_t)(sizeX + offsetX)) / 2;
            iconCenterY = ((int32_t)baseY + (int32_t)sizeY) / 2;
            iconRoom = std::min((int32_t)(sizeX + offsetX) - (int32_t)baseX, (int32_t)sizeY - (int32_t)baseY) / 2;
            textAvailW = (int32_t)(sizeX + offsetX) - (int32_t)baseX - 1;
            textAvailH = (int32_t)sizeY - (int32_t)baseY - 1;
        }
    }

    if (iconCenterX < 0 || this->_icon == GP_BUTTON_ICON_HIDDEN) return;

    // Decide what goes inside the button: a 5x5 icon or a text.
    GPButtonIcon icon = GP_ICON_NONE;
    const char* text = nullptr;

    // Text per input mode: the text set for the active mode's group, or the button's standard name
    // for that mode (R1 / RB / R ..., face buttons as icons when they fit) when none is set.
    bool showName = (this->_icon == GP_BUTTON_ICON_NAME);
    if (this->_icon == GP_BUTTON_ICON_TEXT) {
        if (!this->_textPerMode) {
            text = this->_text.c_str(); // the same text in every mode
        } else {
            const std::string& modeText = this->_modeTexts[getButtonModeGroup(Storage::getInstance().getGamepadOptions().inputMode)];
            if (!modeText.empty()) text = modeText.c_str();
            else showName = true;
        }
    }

    if (showName) {
        InputMode mode = Storage::getInstance().getGamepadOptions().inputMode;
        int8_t index = buttonNameIndex(pinMappings);
        if (index >= 0) {
            if (index < 4 && iconRoom >= 4) icon = getButtonIconForMode(mode, (uint8_t)index);
            if (icon == GP_ICON_NONE) text = getButtonNameForMode(mode, (uint8_t)index);
        }
    } else if (this->_icon != GP_BUTTON_ICON_AUTO) {
        // fixed icon chosen in the layout editor
        if (this->_icon < GP_ICON_COUNT && iconRoom >= 4) icon = (GPButtonIcon)this->_icon;
    } else if (Storage::getInstance().getDisplayOptions().buttonIcons && iconRoom >= 4) {
        // automatic face button icon (PlayStation shapes, Xbox/Nintendo letters, ...)
        int8_t faceIndex = -1;
        if (_inputType == GP_ELEMENT_BTN_BUTTON) {
            faceIndex = faceIndexFromMask((uint32_t)this->_inputMask);
        } else if (_inputType == GP_ELEMENT_PIN_BUTTON && this->_inputMask >= 0 && this->_inputMask < (int32_t)NUM_BANK0_GPIOS) {
            faceIndex = faceIndexFromAction(pinMappings[this->_inputMask].action);
        }
        if (faceIndex >= 0) icon = getButtonIconForMode(Storage::getInstance().getGamepadOptions().inputMode, (uint8_t)faceIndex);
    }

    // pressed buttons are filled, so icons and text are drawn inverted
    uint32_t inkColor = state ? 0 : 1;

    if (text != nullptr && text[0] != '\0') {
        // automatic font: the regular one when it fits with a pixel of clearance from the outline, otherwise 3x5
        GPTextFont font = GP_TEXT_FONT_STANDARD;
        if (this->_textFont == 1) {
            font = GP_TEXT_FONT_TINY;
        } else if (this->_textFont != 2) {
            if ((int32_t)gpTextWidth(text, font) > textAvailW - 2 || (int32_t)gpTextHeight(font) > textAvailH - 2) {
                font = GP_TEXT_FONT_TINY;
            }
        }
        int32_t originX = iconCenterX - (int32_t)gpTextWidth(text, font) / 2;
        int32_t originY = iconCenterY - (int32_t)gpTextHeight(font) / 2;
        gpDrawText(getRenderer(), originX, originY, text, font, inkColor);
    } else if (icon != GP_ICON_NONE) {
        const uint8_t* glyph = GP_BUTTON_ICON_GLYPHS[icon];
        int32_t originX = iconCenterX - GP_BUTTON_ICON_SIZE / 2;
        int32_t originY = iconCenterY - GP_BUTTON_ICON_SIZE / 2;
        for (uint8_t row = 0; row < GP_BUTTON_ICON_SIZE; row++) {
            for (uint8_t col = 0; col < GP_BUTTON_ICON_SIZE; col++) {
                if (glyph[row] & (1 << (GP_BUTTON_ICON_SIZE - 1 - col))) {
                    int32_t px = originX + col;
                    int32_t py = originY + row;
                    if (px >= 0 && py >= 0) getRenderer()->drawPixel((uint16_t)px, (uint16_t)py, inkColor);
                }
            }
        }
    }
}

// Index into the button name tables (see GPButtonIcons.h) for this button, or -1.
int8_t GPButton::buttonNameIndex(GpioMappingInfo* pinMappings) {
    if (_inputType == GP_ELEMENT_BTN_BUTTON) {
        for (uint8_t i = 0; i < GP_BUTTON_NAME_BUTTONS; i++) {
            if ((uint32_t)this->_inputMask == (1u << i)) return (int8_t)i;
        }
    } else if (_inputType == GP_ELEMENT_DIR_BUTTON) {
        switch ((uint32_t)this->_inputMask) {
            case GAMEPAD_MASK_UP:    return GP_BUTTON_NAME_UP;
            case GAMEPAD_MASK_DOWN:  return GP_BUTTON_NAME_DOWN;
            case GAMEPAD_MASK_LEFT:  return GP_BUTTON_NAME_LEFT;
            case GAMEPAD_MASK_RIGHT: return GP_BUTTON_NAME_RIGHT;
            default: break;
        }
    } else if (_inputType == GP_ELEMENT_PIN_BUTTON && this->_inputMask >= 0 && this->_inputMask < (int32_t)NUM_BANK0_GPIOS) {
        return buttonNameIndexFromAction(pinMappings[this->_inputMask].action);
    }
    return -1;
}
