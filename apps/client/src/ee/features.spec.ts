import { Feature, COMMUNITY_FEATURES } from './features';

/**
 * The AI settings module (settings -> AI settings) and the AI Chat sub-options
 * were gated behind the enterprise Feature.AI / Feature.AI_CONTROLS flags, which
 * left the toggles disabled for self-hosted community instances. Adding them to
 * COMMUNITY_FEATURES makes `useHasFeature` return true without a license, so the
 * AI settings UI is usable and AI Chat can be enabled.
 */
describe('COMMUNITY_FEATURES — AI module self-host gate', () => {
  it('includes Feature.AI so the AI settings page is usable without a license', () => {
    expect(COMMUNITY_FEATURES).toContain(Feature.AI);
  });

  it('includes Feature.AI_CONTROLS so AI Chat sub-options are usable without a license', () => {
    expect(COMMUNITY_FEATURES).toContain(Feature.AI_CONTROLS);
  });
});
