# Design

## Context

The cover and inner display screenshots imply roughly 410px and 860px of usable space. The existing form works in a centered column capped at 500px.

## Goals / Non-Goals

- Use the unfolded screen without changing the form's calculations or saved state.
- Deliver a local preview. Device detection, crease alignment, and production release are outside this first pass.

## Decisions

- Use a CSS breakpoint at 830px, with two equal-width panes in a viewport-height grid. Wrap the existing form and results once so resizing never remounts them.
- Keep instructions with the form and the footer after the results. Offer a results placeholder only in the wide layout.

## Risks / Trade-offs

The screenshots give estimates. DevTools can verify resizing and scrolling, but physical PWA testing is needed for keyboard and fold transitions.
