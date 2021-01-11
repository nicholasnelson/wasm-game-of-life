extern crate js_sys;
extern crate web_sys;
extern crate num;
#[macro_use]
extern crate num_derive;

mod utils;

use wasm_bindgen::prelude::*;
use web_sys::console;
use std::cmp;

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
#[derive(Clone, Copy, Debug, PartialEq, Eq, FromPrimitive)]
pub enum Cell {
    Dead = 0,
    Red = 1,
    Green = 2,
    Blue = 3,
}

impl Cell {
    fn toggle(&mut self) {
        *self = match *self {
            Cell::Dead => Cell::Red,
            Cell::Red => Cell::Green,
            Cell::Green => Cell::Blue,
            Cell::Blue => Cell::Dead,
        };
    }

    pub fn food(&self) -> Cell {
        match self {
            Cell::Blue => Cell::Red,
            Cell::Red => Cell::Green,
            Cell::Green => Cell::Blue,
            _ => panic!("Attempted to call food() for Cell type which has no food.")
        }
    }

    pub fn foe(&self) -> Cell {
        match self {
            Cell::Blue => Cell::Green,
            Cell::Red => Cell::Blue,
            Cell::Green => Cell::Red,
            _ => panic!("Attempted to call foe() for Cell type which has no foes.")
        }
    }

    fn to_string(&self) -> &str {
        match *self {
            Cell::Dead => "Dead",
            Cell::Red => "Red",
            Cell::Green => "Green",
            Cell::Blue => "Blue",
        }
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
                
                let (candidate_cell, friendliness, food) = self.neighbor_friendliness(cell, row, col);

                let next_cell = match (cell, friendliness, food) {
                    // Birth
                    (Cell::Dead, 3, _) => candidate_cell,
                    (Cell::Dead, friendliness, food) if friendliness > 0 && food > 0 => candidate_cell,
                    // Starve
                    (_, friendliness, food) if friendliness + food < 2 => Cell::Dead,
                    // Survive
                    (current_cell_state, 2, _) | (current_cell_state, 3, _) => current_cell_state,
                    (current_cell_state, _, food) if food > 0 => current_cell_state,
                    // Overcrowd
                    (_, friendliness, _) if friendliness > 3 => Cell::Dead,
                    // Otherwise, no change
                    (current_cell_state, _, _) => current_cell_state
                };

                next[idx] = next_cell;
            }
        }

        self.cells = next;
    }

    pub fn new(width: u32, height: u32) -> Universe {
        utils::set_panic_hook();
        let cells = (0..width * height)
            .map(|_i| { Cell::Dead })
            .collect();
        Universe {
            width,
            height,
            cells,
        }
    }

    pub fn randomise(&mut self) {
        self.cells = (0..self.width * self.height)
            .map(|_i| {
                let random = (js_sys::Math::random() * 4.0).floor();
                num::FromPrimitive::from_f64(random).unwrap()
            }).collect();
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

    pub fn get_cell_stats(&self, row: u32, column: u32) -> String {
        let cell = self.cells[self.get_index(row, column)];
        let stats = self.neighbor_friendliness(cell, row, column);
        format!("({},{}) {} - Candidate: {}, Friendliness: {}, Food: {}", row, column, cell.to_string(), stats.0.to_string(), stats.1, stats.2)
    }
}

impl Universe {
    fn neighbor_friendliness(&self, cell: Cell, row: u32, column: u32) -> (Cell, i8, i8) {
        // Type, Count of Type, Ate Count
        let mut neighbor_count = vec![
            (Cell::Dead, 0, 0),
            (Cell::Red, 0, 0),
            (Cell::Green, 0, 0),
            (Cell::Blue, 0, 0),
        ];

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

                let target = self.cells[self.get_index(test_row, test_column)];

                // Don't count dead cells
                if target == Cell::Dead {
                    continue;
                }

                // Increment the counter for this cell
                neighbor_count[target as usize].1 += 1;
            }
        }

        // log!(" Pre: {}, {:?}", neighbor_count.len(), neighbor_count);

        // Remove cells which are Dead or have 0 population
        neighbor_count.retain(|&i| i.0 != Cell::Dead && i.1 > 0);

        // Sort by population
        neighbor_count.sort_by(|a, b| b.1.cmp(&a.1));
        // In population order, calculate predating
        for candidate_index in 0..neighbor_count.len() {
            // For each candidate, eat as much food as is available
            // TODO : If we ever have multiple foods per type, may want to change the order here to eat smallest groups first
            for target_index in 0..neighbor_count.len() {
                if neighbor_count[candidate_index].0.food() == neighbor_count[target_index].0 {
                    // Calculate how much the candidate eats
                    neighbor_count[candidate_index].2 = cmp::min(neighbor_count[target_index].1, neighbor_count[candidate_index].1);
                    // Remove the appropriate prey population
                    neighbor_count[target_index].1 -= neighbor_count[candidate_index].2;
                }
            }
        }

        // log!("Post: {}, {:?}", neighbor_count.len(), neighbor_count);

        // If the current cell is dead, elect the strongest surrounding cell type
        if cell == Cell::Dead {
            // Sort into food + population descending order
            neighbor_count.sort_by(|a, b| (b.1 + b.2).cmp(&(a.1 + a.2)));
            // Return the best candidate
            match neighbor_count.first() {
                Some(x) => *x,
                None    => (Cell::Dead, 0, 0)
            }
        // Otherwise give the stats for the currently alive cell type (or 0)
        } else {
            match neighbor_count.iter().find(|i| i.0 == cell) {
                Some(x) => *x,
                None    => (cell, 0, 0)
            }
        }

        // log!("{},{} - Candidate: {} - Friendliness: {} - Food: {}", row, column, candidate_cell.to_string(), friendliness, food);
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
            self.cells[idx] = Cell::Red;
        }
    }
}
