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

## Phase 3: Backend & Persistence (Completed)
- [x] **Cloud Sync**: Supabase integration for multi-device sync (Dual Mode).
- [x] **Stats Dashboard**: Recharts integration (Win Rate, Game Diff icons).
- [x] **Database Schema**: Players, Sessions, Matches tables set up.

## Phase 4: Social & Advanced (Next)
- [ ] **Auth**: Simple admin login / Row Level Security hardening.
- [ ] **Tournament Mode**: Bracket generation.
- [ ] **Notification**: Push notifications for match start.
- [ ] **Tennis Rules RAG**: 테니스 규칙 답변 챗봇 구현 (RAG).
	- [ITF Rules & Regulations](https://www.itftennis.com/en/about-us/governance/rules-and-regulations/)
		- [2025 Rules of Tennis (English)](https://www.itftennis.com/media/7221/2025-rules-of-tennis-english.pdf)
		- [2025 Code of Conduct for Officials](https://www.itftennis.com/media/2511/2025-code-of-conduct-for-officials.pdf)
		- [2025 Duties and Procedures for Officials](https://www.itftennis.com/media/2509/2025-duties-procedures-for-officials.pdf)

## Known Issues
- URL length limit is reached quickly if Match Feed is very long.

## etc
- [ ] 현재 components 폴더에 모든 UI가 모여 있는데, 이를 기능 단위로 쪼개는 연습.
  `features/match/components/...`
  `features/player/components/...`
- [ ] 핵심 로직 단위 테스트 (Unit Test) 구현
  - 로테이션 공식을 검증하는 코드
