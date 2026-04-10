import type { NextConfig } from "next";

const VOCAB_LEVELS = ["easy", "medium", "hard"] as const;

const legacyVocabRedirects = VOCAB_LEVELS.flatMap((sessionLevel) => [
  {
    source: `/practice/comprehension/vocabulary/${sessionLevel}/:setNumber`,
    destination: `/practice/comprehension/vocabulary/:setNumber/${sessionLevel}`,
    permanent: true,
  },
  {
    source: `/practice/comprehension/vocabulary/${sessionLevel}/:setNumber/:passageNumber`,
    destination: `/practice/comprehension/vocabulary/:setNumber/${sessionLevel}/:passageNumber`,
    permanent: true,
  },
]);

const legacyConversationRedirects = VOCAB_LEVELS.map((difficulty) => ({
  source: `/practice/listening/interactive/${difficulty}/:setNumber`,
  destination: `/practice/listening/interactive/1/${difficulty}/:setNumber`,
  permanent: true,
}));

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...legacyVocabRedirects,
      ...legacyConversationRedirects,
      { source: "/setup", destination: "/practice", permanent: false },
      { source: "/settings", destination: "/practice", permanent: false },
      { source: "/dashboard", destination: "/practice", permanent: false },
    ];
  },
};

export default nextConfig;
