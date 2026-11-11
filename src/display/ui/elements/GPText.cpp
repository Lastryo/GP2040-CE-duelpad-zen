#include "GPText.h"

void GPText::draw() {
    if (this->_text.empty()) return;

    // same positioning rules as GPShape
    double scaleX = this->getScaleX();
    double scaleY = this->getScaleY();
    if ((scaleX > 0.0f) & ((scaleY == 0.0f) || (scaleY == 1.0f))) {
        scaleY = scaleX;
    } else if (((scaleX == 0.0f) || (scaleX == 1.0f)) & (scaleY > 0.0f)) {
        scaleX = scaleY;
    }
    uint16_t offsetX = ((getRenderer()->getDriver()->getMetrics()->width - (uint16_t)((double)(this->getViewport().right - this->getViewport().left) * scaleX)) / 2);

    int32_t baseX = this->x;
    int32_t baseY = this->y;
    if (scaleX > 0.0f) baseX = ((this->x) * scaleX + this->getViewport().left) + offsetX;
    if (scaleY > 0.0f) baseY = (this->y) * scaleY + this->getViewport().top;

    uint32_t color = this->strokeColor ? 1 : 0;
    if (this->_background) {
        // solid box with a 1px margin, text in the opposite colour
        int32_t width = gpTextWidth(this->_text.c_str(), this->_font);
        int32_t height = gpTextHeight(this->_font);
        for (int32_t py = baseY - 1; py <= baseY + height; py++) {
            for (int32_t px = baseX - 1; px <= baseX + width; px++) {
                if (px >= 0 && py >= 0) getRenderer()->drawPixel((uint16_t)px, (uint16_t)py, color);
            }
        }
        color = !color;
    }

    gpDrawText(getRenderer(), baseX, baseY, this->_text.c_str(), this->_font, color);
}
