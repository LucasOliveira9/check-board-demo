# ♟️ Board Library – Demo

This project is a **demo application** built to showcase a board visualization library currently under development.

The library is designed to be **engine-agnostic**, focusing strictly on board rendering, interaction handling, and runtime orchestration.  
It does **not implement game rules**.

Any rule system that operates on an 8×8 board (chess or otherwise) can be built on top of it.

---

## 🎯 Purpose

This repository exists primarily for:

- Study and architectural practice
- Runtime experimentation
- Exploring decoupled system design
- Separating UI, board rendering, and rule engines
- Refining a reusable board visualization core

Although fully functional, the main goal is **learning and structural refinement**, not production deployment.

---

## 🧠 Architectural Philosophy

The board library:

- Is independent of game rules
- Emits interaction feedback instead of enforcing legality
- Can be paired with any external rule engine
- Supports runtime-level orchestration
- Keeps rendering separate from logic

The demo implements:

- A chess rule engine layered on top of the board
- Runtime classes responsible for orchestration
- Event-driven communication between system layers

React components act primarily as a rendering layer.  
Core logic is intentionally abstracted outside the UI.

---

## 🚀 Features

### 🔁 Reset

Resets the board to its initial position.

---

### ↩️ Undo / Redo

Navigate backward and forward through moves.

Important behavior:

- Loading a new FEN
- Resetting
- Starting a FEN stream

…will clear move history.

If you undo and make a new move, forward history is discarded and a new branch is created.

---

### 🔤 Text / 🖼 Image Mode

Switch between text-based and image-based piece rendering.

This can be done:

- At any time
- Even during a FEN stream

---

### 📐 Scaling & Highlight

Toggle board scaling behavior and square highlighting.

---

### 🔄 Flip

Rotate the board orientation.

---

### 📡 Load FEN Stream

Loads **1167 FEN positions sequentially**.

- Not all FENs are valid
- More than 1000 valid positions are rendered
- The same button pauses and resumes the stream
- Interaction is allowed while paused
- Resuming discards manual moves and restores the stream

---

### 🧾 Custom FEN Input

Load a custom FEN position manually (if valid).

---

### ⏱ Stream Delay Control

Define the delay between FEN positions during streaming.

---

## 🏗 Project Status

The project is functional but evolving.

Its core objective is:

> Strengthening architectural thinking  
> Practicing runtime decoupling  
> Building a reusable board rendering foundation

---

## 🛠 Tech Stack

- React (UI layer)
- TypeScript
- Runtime orchestration classes
- Event-driven internal communication

---

## 🔮 Long-Term Vision

Planned evolution includes:

- Clear separation between Board, Engine, and UI layers
- Multiplayer support
- Improved runtime abstraction
- A cleaner and more explicit public API

This demo is part of a broader architectural exploration.

---

## 📌 Final Notes

This project intentionally applies architectural rigor beyond what a simple demo would require.

That is deliberate.

The goal is not only to build something functional —  
but to build something structurally strong and extensible.
