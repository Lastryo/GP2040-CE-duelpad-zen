# Validation record

## Completed locally

- Release build in the provided Ubuntu 24.04 Docker container, ARM GCC 13.2.1,
  Pico SDK 2.1.1, Node 18.19.1; web configurator and UF2/ELF compile successfully.
- `static_assert` verifies the packed P5General input report is exactly 64 bytes,
  matching the dongle authentication report buffer.
- Compared 29 hardware/gameplay defaults against Duelpad's vendor source:
  USB Host, I2C0/OLED, RGB data/LED count and main gameplay GPIO actions match.
  Navigation actions and UI use the upstream implementation, as documented.
- Shell syntax check of `scripts/build-duelpad.sh` and `git diff v0.7.12 --check` pass.
- Two upstream report bounds fixes are included.
- The local build exposed missing `pkg_resources` with modern setuptools;
  `lib/nanopb/extra/requirements.txt` now pins setuptools 80.9.0.

Build warnings remain in inherited code, including macro redefinitions in board
configuration, third-party library conversions and a newlib `_getentropy` stub.
A successful build does not establish that all hardware paths are correct.

## Not yet verified

GitHub Actions has not run yet. No firmware has been flashed. USB Host enumeration
on the physical controller, display/input timing, actual polling rate, PS5
version compatibility and all console acceptance checks remain pending. See the
hardware checklist in README.md before treating this as a tested console release.
