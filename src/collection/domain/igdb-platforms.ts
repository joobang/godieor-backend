// Exact IGDB platform IDs, verified against /v4/platforms. Keep the original ID in the event source key.
const gameDeviceByPlatform = new Map<number, "playstation" | "xbox" | "switch" | "ios" | "android">([
  [7, "playstation"], [8, "playstation"], [9, "playstation"], [38, "playstation"],
  [46, "playstation"], [48, "playstation"], [167, "playstation"],
  [11, "xbox"], [12, "xbox"], [49, "xbox"], [169, "xbox"],
  [130, "switch"], [508, "switch"],
  [34, "android"], [39, "ios"],
]);

export const igdbPlatformIds = [...gameDeviceByPlatform.keys()];
export function igdbGameDevice(platformId: unknown) {
  return typeof platformId === "number" ? gameDeviceByPlatform.get(platformId) : undefined;
}
