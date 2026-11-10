add_library(NeoPico
src/NeoPico.cpp
)
target_include_directories(NeoPico PUBLIC
 src
 )

set(NEOPICO_PIO_SOURCE ${CMAKE_CURRENT_LIST_DIR}/src/ws2812.pio)
if(GP2040_BOARDCONFIG STREQUAL "DuelPadZen")
    # Match the vendor signal timing for the Zen LED hardware.
    set(NEOPICO_PIO_SOURCE ${CMAKE_SOURCE_DIR}/configs/DuelPadZen/ws2812.pio)
endif()
pico_generate_pio_header(NeoPico ${NEOPICO_PIO_SOURCE} OUTPUT_DIR ${CMAKE_CURRENT_BINARY_DIR}/generated)
target_include_directories(NeoPico PUBLIC ${CMAKE_CURRENT_BINARY_DIR}/generated)

target_link_libraries(NeoPico PUBLIC
pico_stdlib
hardware_pio
hardware_clocks
hardware_timer
)
