# Security Specification: Multi-Operator Tactical Mesh Sync (Firebase Firestore)

## 1. Data Invariants
- **Mission Ownership & Isolation**: Every tactical mission room (`/mesh_missions/{missionId}`) has a verified `ownerId`. Sub-resources (`nodes`, `waypoints`, `messages`, `sos`) derive context directly from `{missionId}`.
- **Append-Only Packet Log**: Mesh messages (`/mesh_missions/{missionId}/messages/{messageId}`) cannot be updated once created (`allow update: if false;`), ensuring tamper-evident RF audit logs.
- **Tamper-Resistant SOS Beacon**: Emergency SOS state can only be triggered or cleared by authenticated operators in that mission, with strict schema boundaries on coordinates and payloads.
- **Zero Identity Spoofing**: All mutations enforce `request.auth != null` and check caller authorization.
- **Anti-Resource Poisoning**: Strict length limits on strings (`shortName` <= 16, `longName` <= 64, `text` <= 2048, `id` <= 128) and regex matching `^[a-zA-Z0-9_\\-\\.:]+$` prevent ID poisoning.

## 2. Dirty Dozen Invariant Breach Payloads (All Rejected by Rules)
1. **Unauthenticated Mission Injection**: An unauthenticated client attempting to create `/mesh_missions/op-bad` $\rightarrow$ Rejected by `isSignedIn()`.
2. **Ghost Owner Impersonation**: Attacker passing `ownerId: "victim-uid"` in `incoming()` $\rightarrow$ Rejected by `incoming().ownerId == request.auth.uid`.
3. **Huge String Denial-of-Wallet**: Attacker passing a 2MB message payload into `text` $\rightarrow$ Rejected by `data.text.size() <= 2048`.
4. **ID Traversal Poisoning**: Malicious path `/mesh_missions/../../secrets` $\rightarrow$ Rejected by `isValidId(missionId)`.
5. **Node Telemetry Shadow Field Injection**: Injecting arbitrary root keys into `nodes/{nodeId}` $\rightarrow$ Validated strictly by `isValidMissionNode`.
6. **Chat Log Mutation Attempt**: Attempting to edit an existing transmitted LoRa packet $\rightarrow$ Rejected by `allow update: if false;`.
7. **Arbitrary Waypoint Spoofing**: Submitting a waypoint with NaN or unconstrained strings $\rightarrow$ Rejected by numeric and size checks in `isValidMissionWaypoint`.
8. **Foreign Mission Bleed**: Writing a node to `/mesh_missions/mission-A/nodes/node-1` with `missionId: "mission-B"` $\rightarrow$ Rejected by `incoming().missionId == missionId`.
9. **SOS Clear by Non-Member**: Clearing emergency distress when unauthorized $\rightarrow$ Gated by mission membership and admin checks.
10. **Admin Claim Privilege Escalation**: Passing custom claims in token $\rightarrow$ Evaluated against trusted DB doc or verified admin email only.
11. **Blanket Query Scraping**: Attempting an unrestricted collectionGroup query on all missions $\rightarrow$ Gated by path-level security rules.
12. **Malformed Telemetry Buffer**: Injecting binary junk into RF statistics $\rightarrow$ Validated by numeric typing (`is number`).
