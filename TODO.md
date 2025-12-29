# 📝 Project To-Do List

## Phase 1: MVP (Completed)
- [x] **Core**: Player Add/Remove, 5-Person Rotation (Reverse Index).
- [x] **UI**: Dark Mode, Mobile Layout.
- [x] **Sharing**: URL-based state sharing.
- [x] **Match Schedule**: Unified view showing Past Results -> Current Score -> Future Preview.
- [x] **Reordering**: Manual "Edit Mode" with Up/Down arrows (Fixed Safari DnD issues).
- [x] **Chat**: Select author identity.
- [x] **Undo Function**: Revert "Finish Match" and stats if pressed by mistake.
- [x] **Schedule Safety**: Confirmation warning before overwriting queued matches.

## Phase 2: Usability Improvements (Next)
- [ ] **Tie-break Support**: Allow entering '7-6 (4)' style scores.
- [ ] **Player Avatars**: Allow uploading simple photos or choosing colors.
- [ ] **Multiple Courts**: Logic for 8-10 players on 2 courts simultaneously.

## Phase 3: Backend & Social
- [ ] **Auth**: Simple admin login for clubs.
- [ ] **Cloud Sync**: Replace URL sharing with Firebase/Supabase real-time database.
- [ ] **Tournament Mode**: Bracket generation.

## Known Issues
- URL length limit is reached quickly if Match Feed is very long.

## etc
- [ ] 현재 components 폴더에 모든 UI가 모여 있는데, 이를 기능 단위로 쪼개는 연습.
  `features/match/components/...`
  `features/player/components/...`
- [ ] 핵심 로직 단위 테스트 (Unit Test) 구현
  - 로테이션 공식을 검증하는 코드
