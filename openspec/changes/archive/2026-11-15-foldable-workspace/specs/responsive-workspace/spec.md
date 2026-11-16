## Purpose

Keep crafting inputs and results usable on narrow phones and wide displays, including foldable phones.

## ADDED Requirements

### Requirement: Adaptive crafting workspace
The app SHALL use a stacked layout on viewports narrower than 830 CSS pixels and two equal-width, independently scrolling panes at 830 CSS pixels or wider.

#### Scenario: Wide viewport
- **WHEN** the viewport is at least 830 CSS pixels wide
- **THEN** the form appears on the left and the batch list, summary, and sheet output appear on the right as applicable
- **AND** scrolling one pane does not scroll the other

#### Scenario: Narrow viewport
- **WHEN** the viewport is narrower than 830 CSS pixels
- **THEN** the existing form and output stack in document order and scroll together

#### Scenario: Switch layouts during an order
- **WHEN** the viewport crosses the breakpoint with a draft, batch, or output on screen
- **THEN** entered values, saved orders, and the selected output view remain intact
