import { useAtom } from "jotai";
import { entitlementAtom } from "@/ee/entitlement/entitlement-atom";
import { COMMUNITY_FEATURES } from "@/ee/features";

export const useHasFeature = (feature: string): boolean => {
  const [entitlements] = useAtom(entitlementAtom);
  const hasLicensedFeature = entitlements?.features?.includes(feature) ?? false;
  return hasLicensedFeature || COMMUNITY_FEATURES.includes(feature);
};
