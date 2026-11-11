#ifndef _GPTEXT_H_
#define _GPTEXT_H_

#include <string>
#include "GPWidget.h"
#include "GPTextRender.h"

// Free text placed anywhere on the button screen (layout editor "Text" element)
class GPText : public GPWidget {
    public:
        void draw();
        GPText* setText(const char* text) { this->_text = text ? text : ""; return this; }
        GPText* setFont(GPTextFont font) { this->_font = font; return this; }
        GPText* setBackground(bool background) { this->_background = background; return this; }
    private:
        std::string _text;
        GPTextFont _font = GP_TEXT_FONT_TINY;
        bool _background = false;
};

#endif
