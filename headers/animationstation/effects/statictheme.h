#ifndef STATIC_THEME_H_
#define STATIC_THEME_H_

#include <iterator>
#include <map>
#include <vector>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include "animation.h"
#include "animationstation.h"

// Theme indexes are persisted in AnimationOptions.themeIndex; keep this order stable.
enum StaticThemeIndex : uint32_t {
  STATIC_THEME_RAINBOW = 0,
  // Face buttons follow the active input mode (Xbox / PlayStation / Nintendo),
  // everything else is warm yellow. Other modes fall back to the rainbow theme.
  STATIC_THEME_AUTO_INPUT_MODE = 20,
};

class StaticTheme : public Animation {
public:
  StaticTheme(PixelMatrix &matrix);
  ~StaticTheme() {};

  void AddTheme(const std::map<uint32_t, RGB>& theme) { themes.push_back(theme); }
  void ClearThemes() { themes.clear(); }
  bool Animate(RGB (&frame)[100]);
  void ParameterUp();
  void ParameterDown();
protected:
  const std::map<uint32_t, RGB>& ResolveAutoTheme() const;
  std::map<uint32_t, RGB> autoThemeXbox;
  std::map<uint32_t, RGB> autoThemePlayStation;
  std::map<uint32_t, RGB> autoThemeNintendo;
  RGB defaultColor = ColorBlack;
  std::vector<std::map<uint32_t, RGB>> themes;
};

#endif
