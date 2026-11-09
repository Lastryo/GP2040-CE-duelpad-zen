# DuelPad Zen on GP2040-CE 0.7.12 with P5General

Experimental community build; not an official Duelpad or Besavior release.

## Sources and scope

- Base: OpenStickCommunity/GP2040-CE tag `v0.7.12`, commit `0014e4ae2a312332e2582f6708dcc7d6bec5de8c`.
- P5General driver and web settings: upstream PR #1546 (`daba76640b1a66091d1c60a35b8a9ab5f9b262f6`).
- Display coexistence: upstream PR #1728 (`fd41bf26838e1b95820240b4b218f427b7f64c44`), processing dongle authentication on Core0 instead of Core1.
- Driver report-copy and string-index bounds fixes from upstream PR #1719 (`e78814b9666db3b0ef3357a5a0915cc37434afe8`), limited to P5GeneralDriver.cpp.
- Zen board defaults restored from the parent of upstream removal commit `3ab5d7252446445a9f7cef448dd50fa56e1d7423`.

Upstream removed Zen's board configuration in PR #1522 because its mini-menu
was different from Duelpad's vendor fork and caused upgrade confusion. This
build uses the upstream mini-menu, **not the factory Duelpad UI**. The main
button map, USB host pins and display pins match the vendor source. Menu
navigation uses upstream actions and differs from the vendor implementation.
The original vendor firmware remains available at
https://github.com/duelpadarcade/Duelpad-Zen.

## Board wiring and defaults

- RP2040; USB Host D+ = GP22, D- = GP23, normal pin order.
- OLED: I2C0, SDA = GP20, SCL = GP21. Display remains enabled.
- RGB data = GP15, two LEDs per pixel; restored upstream Zen LED map.
- Navigation stick: up GP17, down GP13, left GP8, right GP14, select GP12.
- Hold B4 (Triangle/Y in the gameplay layout) while connecting to select
  P5General. B3 selects XInput. Existing saved boot mappings may override defaults.
- This does not force P5General on every boot; it remains selectable in web config.

The Core0 fix is intended to address the original P5General/I2C display slowdown.
It has not yet been verified on this physical Zen. Do not move the display to
I2C1 in software: GP20/21 are wired to I2C0.

## Build

From the repository root, with Docker:

```sh
docker build -f tools/Dockerfile.duelpad -t duelpad-zen-build:0.7.12 .
docker run --rm -v "$PWD:/src" duelpad-zen-build:0.7.12 ./scripts/build-duelpad.sh
```

Or install an ARM bare-metal toolchain, CMake, Make, Python with venv, Node/npm,
Git, Pico SDK 2.1.1 and run `PICO_SDK_PATH=/path/to/pico-sdk ./scripts/build-duelpad.sh`.
The build downloads dependencies and builds the web configurator with the new
input mode. Output is `build-duelpad/GP2040-CE_*_DuelPadZen.uf2`.
GitHub Actions workflow **DuelPad Zen P5General** runs the same container build.

## Before flashing and configuration

1. Export the full Zen configuration from Web Config and keep the vendor UF2
   available for rollback. Record your board revision and firmware version.
2. Enter BOOTSEL using the board's documented BOOT procedure. Copy only the
   DuelPadZen UF2 to the `RPI-RP2` drive. Do not use a Pico or another board's UF2.
3. Do not flash-nuke by default. Stored settings normally survive a UF2 update,
   but compatibility with factory settings is not guaranteed. Back up before reset.
4. Enter Web Config by holding Start while connecting to a PC. Open
   http://192.168.7.1 and select **P5General** under input mode.
5. Verify USB Host is enabled: D+ 22, D- 23, normal order. Existing saved
   configuration takes precedence over compile-time defaults.
6. Keep I2C0/display on their original GP20/21 pins. Save and reboot into
   controller mode; connect P5General to Zen's host/extension port and the
   controller's device port to PS5. Do not confuse the two USB roles.
7. On PS5 select USB communication under controller settings where available.
   Use a Besavior dongle firmware compatible with GP2040-CE; record its version.
   Do not downgrade a newer dongle blindly to an old firmware mentioned in a guide.

## Validation

See [VALIDATION.md](VALIDATION.md) for completed local checks and limitations.

## Hardware acceptance checklist — pending

Compilation is not proof of console authentication or a 1000 Hz effective rate.
Record Zen revision, UF2 SHA-256, dongle version, PS5 system version and game.

- [ ] Back up settings and verify recovery to vendor firmware is possible.
- [ ] In XInput on PC verify every gameplay button, both up buttons, SOCD,
      auxiliary buttons, RGB mapping, OLED and navigation stick.
- [ ] In P5General mode verify the dongle enumerates through GP22/23 USB Host.
- [ ] Verify PS5 menu input, PS button and inputs inside the target PS5 game.
- [ ] Play for at least 30 minutes, including beyond 8 minutes, without disconnects.
- [ ] Compare input/report timing with OLED active and inactive; do not assume
      a console polling interval proves the absence of dropped/late reports.
- [ ] Verify cold boots, soft reboot, cable reconnect and dongle reconnect.
- [ ] Verify Web Config remains accessible and saved configuration survives reboot.

If display activity still affects input, first collect timing and reproducible
steps. Disabling I2C0 is a diagnostic fallback and removes the OLED/menu; it is
not claimed as a required or verified fix in this build. Rumble is not supported
by the imported P5General implementation.
