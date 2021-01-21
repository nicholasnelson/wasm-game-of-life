use std::fmt;
use wasm_bindgen::prelude::*;

use crate::utils;

#[wasm_bindgen]
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Cell {
    properties: [u8; 3]
}

impl Cell {
    fn toggle(&mut self) {
        if self.is_alive() {
            self.properties = [0,0,0];
        } else {
            self.properties = [255,0,0];
        }
    }

    fn is_alive(&self) -> bool {
        self.properties[0] != 0u8 || self.properties[1] != 0u8 || self.properties[2] != 0u8
    }

    fn new(properties: [u8; 3]) -> Cell {
        Cell { properties }
    }
}

impl fmt::Display for Cell {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Cell({},{},{})", self.properties[0], self.properties[1], self.properties[2])
    }
}

#[wasm_bindgen]
#[repr(C)]
pub struct Universe {
    width: u32,
    height: u32,
    cell_buffer: [Vec<Cell>; 2],
    cell_buffer_index: usize,
}

#[wasm_bindgen]
impl Universe {
    pub fn tick(&mut self) -> usize {

        let next_cell_buffer_index = (self.cell_buffer_index + 1) % self.cell_buffer.len();

        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cell_buffer[self.cell_buffer_index][idx];

                self.cell_buffer[next_cell_buffer_index][idx] = match (cell.is_alive(), self.neighbor_count(row, col)) {
                    (true, neighbors) if neighbors < 2 => Cell::new([0,0,0]),
                    (true, 2) | (true, 3) => cell,
                    (true, neighbors) if neighbors > 3 => Cell::new([0,0,0]),
                    (false, 3) => Cell::new([255,0,0]),
                    (_, _) => cell,
                };
            }
        }

        self.cell_buffer_index = next_cell_buffer_index;
        self.cell_buffer_index
    }

    pub fn new(width: u32, height: u32) -> Universe {
        utils::set_panic_hook();
        let cells: Vec<Cell> = (0..width * height)
            .map(|_i| { Cell::new([0,0,0]) })
            .collect();
        Universe {
            width,
            height,
            cell_buffer: [cells.clone(), cells],
            cell_buffer_index: 0,
        }
    }

    pub fn randomise(&mut self) {
        for i in 0..self.cell_buffer[self.cell_buffer_index].len() {
            if js_sys::Math::random() > 0.5 {
                self.cell_buffer[self.cell_buffer_index][i] = Cell::new([255,0,0])
            } else {
                self.cell_buffer[self.cell_buffer_index][i] = Cell::new([0,0,0])
            }
        }
    }

    pub fn set_pattern(&mut self) {
        for i in 0..self.cell_buffer[self.cell_buffer_index].len() {
            if i % 3 == 0 || i % 5 == 0 {
                self.cell_buffer[self.cell_buffer_index][i] = Cell::new([255,0,0])
            } else {
                self.cell_buffer[self.cell_buffer_index][i] = Cell::new([0,0,0])
            }
        }
    }

    /// Set all cells to dead state
    pub fn clear_cells(&mut self) {
        self.cell_buffer[self.cell_buffer_index] = (0..self.width * self.height).map(|_i| Cell::new([0,0,0])).collect();
    }

    pub fn toggle_cell(&mut self, row: u32, column: u32) {
        let idx = self.get_index(row, column);
        self.cell_buffer[self.cell_buffer_index][idx].toggle();
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn get_cell_buffer_ptr(&self, buffer_index: usize) -> *const Cell {
        self.cell_buffer[buffer_index].as_ptr()
    }

    pub fn get_index(&self, row: u32, column: u32) -> usize {
        (row * self.width + column) as usize
    }

    pub fn get_cell_stats(&self, row: u32, column: u32) -> String {
        let cell = self.cell_buffer[self.cell_buffer_index][self.get_index(row, column)];
        let neighbor_count = self.neighbor_count(row, column);
        format!("({},{}) {} - Neighbors: {}", row, column, cell, neighbor_count)
    }
}

impl Universe {
    fn neighbor_count(&self, row: u32, column: u32) -> u8 {
        let mut neighbor_count = 0u8;
        
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

                if self.cell_buffer[self.cell_buffer_index][self.get_index(test_row, test_column)].is_alive() {
                    neighbor_count += 1;
                }
            }
        }

        neighbor_count
    }

    /// Get the dead and alive values of the entire universe
    pub fn get_cells(&self) -> &[Cell] {
        &self.cell_buffer[self.cell_buffer_index]
    }
}
