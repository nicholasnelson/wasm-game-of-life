extern crate js_sys;
extern crate web_sys;

mod utils;

//use std::fmt;
use wasm_bindgen::prelude::*;
use web_sys::console;


// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// A macro to provide 'println!(...)'-style syntax for 'console.log' logging
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t)* ).into());
    }
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Dead = 0,
    Alive = 1,
}

impl Cell {
    fn toggle(&mut self) {
        *self = match *self {
            Cell::Dead => Cell::Alive,
            Cell::Alive => Cell::Dead,
        };
    }
}

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: Vec<Cell>
}

#[wasm_bindgen]
impl Universe {
    pub fn tick(&mut self) {

        let mut next = self.cells.clone(); 

        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cells[idx];
                let live_neighbors = self.live_neighbor_count(row, col);

                let next_cell = match (cell, live_neighbors) {
                    // Rule 1: Die if < 2 live neighbors : IDEA - Hierarchical "foodchain" where this is based on live neighbors lower on the chain
                    (Cell::Alive, x) if x < 2 => Cell::Dead,
                    // Rule 2: Survive if 2-3 live neighbors
                    (Cell::Alive, 2) | (Cell::Alive, 3) => Cell::Alive,
                    // Rule 3: Die if > 3 live neighbors
                    (Cell::Alive, x) if x > 3 => Cell::Dead,
                    // Rule 4: Birth if 3 live neighbors
                    (Cell::Dead, 3) => Cell::Alive,
                    // Otherwise, no change
                    (current_cell_state, _) => current_cell_state
                };

                next[idx] = next_cell;
            }
        }

        self.cells = next;
    }

    pub fn new(width: u32, height: u32) -> Universe {
        utils::set_panic_hook();
        let cells = (0..width * height)
            .map(|i| {
                //if js_sys::Math::random() < 0.5 {
                if i % 2 == 0 || i % 7 == 0 {
                    Cell::Dead
                } else {
                    Cell::Alive
                }
            })
            .collect();
        Universe {
            width,
            height,
            cells,
        }
    }

    /// Set the width of the universe
    ///
    /// Reset all cells to dead state
    pub fn set_width(&mut self, width: u32) {
        self.width = width;
        self.clear_cells();
    }

    /// Set the height of the universe
    ///
    /// Reset all cells to dead state
    pub fn set_height(&mut self, height: u32) {
        self.height = height;
        self.clear_cells();
    }

    /// Set all cells to dead state
    pub fn clear_cells(&mut self) {
        self.cells = (0..self.width * self.height).map(|_i| Cell::Dead).collect();
    }

    pub fn toggle_cell(&mut self, row: u32, column: u32) {
        let idx = self.get_index(row, column);
        self.cells[idx].toggle();
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn cells(&self) -> *const Cell {
        self.cells.as_ptr()
    }

    pub fn get_index(&self, row: u32, column: u32) -> usize {
        (row * self.width + column) as usize
    }
}

impl Universe {
    fn live_neighbor_count(&self, row: u32, column: u32) -> u8 {
        let mut count = 0;

        let row_above = match row {
            r if r == 0             => self.height - 1,
            r                       => r - 1,
        };

        let row_below = match row {
            r if r >= self.height - 1   => 0,
            r                           => r + 1,
        };

        let column_left = match column {
            c if c == 0                 => self.width - 1,
            c                           => c - 1
        };

        let column_right = match column {
            c if c >= self.width - 1    => 0,
            c                           => c + 1
        };

        for test_row in [row_above, row, row_below].iter().cloned() {
            for test_column in [column_left, column, column_right].iter().cloned() {
                if test_row == row && test_column == column {
                    continue;
                }

                let idx = self.get_index(test_row, test_column);
                count += self.cells[idx] as u8;
            }
        }
        count
    }

    /// Get the dead and alive values of the entire universe
    pub fn get_cells(&self) -> &[Cell] {
        &self.cells
    }

    /// Set cells to alive in the universe by passing row and column
    /// of each cell as an array
    pub fn set_cells(&mut self, cells: &[(u32, u32)]) {
        for (row, col) in cells.iter().cloned() {
            let idx = self.get_index(row, col);
            self.cells[idx] = Cell::Alive;
        }
    }
}

// impl fmt::Display for Universe {
//     fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
//         for line in self.cells.as_slice().chunks(self.width as usize) {
//             for &cell in line {
//                 let symbol = if cell == Cell::Dead { '◻' } else { '◼' };
//                 write!(f, "{}", symbol)?;
//             }
//             write!(f, "\n")?;
//         }

//         Ok(())
//     }
// }

// pub struct Timer<'a> {
//     name: &'a str,
// }