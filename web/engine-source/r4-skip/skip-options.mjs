/* WebGAL project patch, MPL-2.0. See ../../LICENSE-WebGAL-MPL-2.0.txt. */

// Older project builds inherited WebGAL's read-only default. Migrate just that
// option once, keeping the existing save namespace and all unrelated settings.
// A subsequent, deliberate choice of read-only mode survives reloads/imports.
export function normalizeR4SkipOptions(previous, defaults) {
  const options = { ...defaults, ...previous };
  if (previous.fishSkipModeVersion !== 1) options.skipAll = true;
  options.fishSkipModeVersion = 1;
  return options;
}
