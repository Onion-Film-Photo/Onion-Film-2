/** Serialize records for the support bundle. The output may be shared outside the account. */
export function makeSupportBundle(records) {
  const visible = records.map(({ id, displayName }) => ({ id, displayName }));
  return JSON.stringify({ entries: visible });
}
