#![feature(test)]

// #![cfg(target_arch = "x86_64")]

extern crate test;
extern crate wasm_game_of_life;

use wasm_game_of_life::universe::Universe;

#[bench]
fn universe_ticks(b: &mut test::Bencher) {
    let mut universe = Universe::new(128, 128);

    universe.set_pattern();

    b.iter(|| {
        universe.tick();
    });
}