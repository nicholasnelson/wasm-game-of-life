#!/bin/bash

RUSTFLAGS="-g" cargo bench | tee -a ./bench-results.txt

TARGET_FOLDER='./target/release/deps/'

BENCH_TARGET=$(ls -htr $TARGET_FOLDER | grep bench | tail -n 1)

BENCHMARK_EXECUTABLE="${TARGET_FOLDER}${BENCH_TARGET}"


valgrind --tool=callgrind --dump-instr=yes --collect-jumps=yes --simulate-cache=yes "${BENCHMARK_EXECUTABLE}" --bench

CALLGRIND_OUTPUT=$(ls -htr ./ | grep callgrind.out | tail -n 1)

kcachegrind "${CALLGRIND_OUTPUT}"