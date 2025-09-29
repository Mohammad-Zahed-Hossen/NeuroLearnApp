# TODO List for MindMapGeneratorService Update

- [x] Implement `calculateSemanticSimilarity` method for semantic link generation.
- [x] Lower semantic similarity threshold from 0.3 to 0.1 to increase connections.
- [x] Add debug logging for semantic similarity calculations.
- [x] Verify TypeScript compilation passes without errors.
- [x] Run development server and verify no runtime errors.
- [x] Confirm semantic links are generated and visible in the mind map.
- [ ] Skip further testing as per user request.
- [ ] Complete task and finalize changes.

- [ ] Add progressive loading state with skeleton UI and loading progress
- [ ] Add search/filter bar above Canvas for node filtering and highlighting
- [ ] Add mini-map navigator overlay with viewport indicator

- [x] Replace straight line links with curved Bezier paths in renderSingleLink
- [x] Add node shape differentiation (circle, rectangle, diamond, star) based on node type

## Implementation Order
1. Performance fixes (steps 1)
2. TypeScript fixes
3. Curved links
4. Search/filter bar
5. Loading skeleton
6. Mini-map
7. Node shape differentiation
