//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use wasm_bindgen_test::*;

extern crate wasm_game_of_life;
use wasm_game_of_life::Universe;
use wasm_game_of_life::Cell;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
pub fn test_cell_food() {
    // Red eats Green
    let input_cell = Cell::Red;
    let expected_food = Cell::Green;
    assert_eq!(&input_cell.food(), &expected_food);
    // Green eats Blue
    let input_cell = Cell::Green;
    let expected_food = Cell::Blue;
    assert_eq!(&input_cell.food(), &expected_food);
    // Blue eats Red
    let input_cell = Cell::Blue;
    let expected_food = Cell::Red;
    assert_eq!(&input_cell.food(), &expected_food);
}

#[wasm_bindgen_test]
pub fn test_cell_foe() {
    // Red eats Green
    let input_cell = Cell::Green;
    let expected_food = Cell::Red;
    assert_eq!(&input_cell.foe(), &expected_food);
    // Green eats Blue
    let input_cell = Cell::Blue;
    let expected_food = Cell::Green;
    assert_eq!(&input_cell.foe(), &expected_food);
    // Blue eats Red
    let input_cell = Cell::Red;
    let expected_food = Cell::Blue;
    assert_eq!(&input_cell.foe(), &expected_food);
}