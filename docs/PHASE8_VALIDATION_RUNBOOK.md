# Phase 8 Browser Validation Runbook

Record the date, Git commit, database branch, browser versions, and operator for every run.

1. Sign in as ADMIN and open **Portfolio Orchestrator**.
2. Create a DRAFT Project in a supported domain.
3. Add a DRAFT Lab; verify domain/kind are derived consistently.
4. Add one valid primary input and required normalized state/topology.
5. Add a scenario, runbook step, and public evidence.
6. Deliberately introduce an invalid field and confirm validation reports a stable ERROR without writing state.
7. Correct it and obtain a valid report.
8. Open exact preview and confirm it uses existing public/domain components without publishing.
9. Open a second Admin session, edit the aggregate, and confirm the first stale revision receives HTTP 409/reload guidance.
10. Mark the Lab READY through the validated action.
11. Publish the Project through the wizard.
12. In logged-out/incognito mode, confirm only selected READY Labs are public and raw input payloads/private evidence/storage keys are absent.
13. Confirm the existing domain explorer and Unified CLI consume the new Lab without source-code changes.
14. Start a Phase 7 scenario; confirm the explorer, Operations panel, and CLI share the session overlay.
15. Attempt a canonical topology/input/scenario change and confirm active-runtime conflict.
16. Explicitly reset runtimes; confirm only the count is displayed/audited and the edit then succeeds.
17. Refresh the original scenario browser and confirm canonical state is unchanged.
18. Duplicate the Project/Lab and confirm new IDs/slugs, DRAFT state, revision 1, and no runtimes.
19. Reorder Projects and Labs and confirm atomic ordering plus stale-revision conflict.
20. Export the Project and inspect that no credential/session/audit/runtime/storage-key data exists.
21. Dry-run/import a copy with deterministic RENAME mode and confirm it remains DRAFT.
22. Export/import a Networking companion manifest and confirm supported fields round-trip; confirm `.pkt` remains reference-only.
23. Update an Artifact association; confirm affected revisions increment and private references stay private.
24. Archive the Project and confirm immediate public removal; restore it to DRAFT and require new validation.
25. As ADMIN, confirm permanent delete is forbidden. As SUPER_ADMIN, confirm typed confirmation and DRAFT/ARCHIVED/no-runtime guards.
26. Review persisted bounded AuditLog actions and confirm no full bundle, payload, credentials, or session keys were logged.
27. Repeat automated adapter coverage for Networking, Linux, and DevOps using `npm run verify`.

Pass only when all observations match and the working tree remains clean after fixture cleanup.
