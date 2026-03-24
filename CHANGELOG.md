# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-03-17

### Added
- **Phase 1 Infrastructure Implementation**:
    - **Result Card PNG Export**: Integrated `html2canvas` with watermark for branding.
    - **One-click Sharing**: Added KakaoTalk sharing SDK and buttons.
    - **Dynamic OG Tags**: Implemented D1-backed middleware for character-specific social previews.
    - **GA4 Integration**: Added custom events for `share_click`, `result_viewed`, and `image_saved`.

## [Planned]

### Phase 2: Seeding & Viral Outreach
- [ ] **Content Preparation:** Extract high-quality result cards for trending characters.
- [ ] **Community Strategy:** Draft post templates for DC Inside, ArcaLive, and Twitter/X.
- [ ] **Outreach:** Identify key subculture influencers for potential collaboration.

### Phase 3: Analysis & Scaling
- [ ] **Data Review:** Analyze GA4 data to identify high-performing channels.
- [ ] **Viral Loop Optimization:** Identify and fix friction points in the sharing flow.
- [ ] **Growth Tracking:** Begin MAU tracking for potential partnership pitching (e.g., Laftel).


## [2.0.1] - 2026-03-06

### Fixed
- **ResultScreen:** Fixed an issue on iOS/Safari where the character card image would appear blank when flipped. Removed redundant inline `backface-visibility` and 3D transform styles that caused rendering conflicts.
- **LandingScreen:** Corrected a typo in the character ticker where "Bocchi the Rock!" (봇치 더 록!) was misspelled as "봇치 더 고!".

## [2.0.0] - 2026-03-05

### Added
- Initial v2.0.0 release.
