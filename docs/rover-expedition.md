# Rover arcade expedition

Choose **Play** in the app navigation. **Drive my plan** is available after setting a base and adding at least one trip destination. **Start practice mission** launches immediately with three fictional destinations. Neither mode requires a speed assumption, an account or a new service.

## Playing

- Drive with **WASD** or **arrow keys**, or hold the on-screen directional controls.
- Follow the gold dotted trail and the minimap to the next numbered beacon.
- At a checkpoint, press **Space** or choose **Scan checkpoint**. The first proposed task from that stop is shown as an observation prompt.
- After scanning all destinations in order, return to the base ring to complete the expedition.
- **Route assist** drives toward the current checkpoint; manual steering or throttle takes over while held. Scanning remains an explicit action.
- **P** or **Pause** stops the expedition. Switching away from the browser also pauses it. **Restart expedition** clears the game journal and returns the rover to the start. **Escape** or **Back to planning** closes the game and restores focus to its launch button.

The game takes a snapshot when launched. It preserves destination names, order and task prompts, adds the return to base, and never modifies the planner's coordinates, assumptions, saved drafts or review checkboxes. Scans are game discoveries, not completed scientific work.

## Stylized terrain and routes

The scene uses an original procedural height field, perspective-projected polygon terrain, a six-wheel rover and a chase camera. It renders through Canvas 2D without WebGL, external imagery, generated bitmap assets or additional dependencies. It remains playable when the globe cannot load.

The arena is schematic. Successive planned bearings determine checkpoint directions, with log-compressed leg lengths for local and Mars-wide destinations. The final checkpoint is the same game-space base. The route is not georeferenced terrain, a physical rover simulation, a verified traverse or an estimate of mission duration. Rock props are decorative; no hazard avoidance, energy model or terrain eligibility is calculated. Game speed is displayed in game units per second and does not supply a capability to the planner. Existing scientific map data and colours remain unchanged.

## Files and verification

- `src/game/expedition.ts`: schematic route conversion, driving state, checkpoint and scan transitions.
- `src/game/render-expedition.ts`: perspective terrain, rover, route, beacons and minimap renderer.
- `src/game/ExpeditionGame.tsx`: launch controls, modal session, keyboard/pointer input, pause, restart and journal.
- `src/game/expedition.css`: responsive launch card and game UI.
- `tests/expedition-game.spec.ts`: route/state boundaries, a complete practice mission, keyboard/pointer controls, pause/reset and imported-plan isolation.

Run `npm run build`, `npm run lint` and `npm test -- tests/expedition-game.spec.ts`. Browser checks retain desktop/mobile screenshots in `docs/rover-expedition-*.png`.
