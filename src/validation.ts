export type FilterValue = string | string[];

export function validateTone(tone: FilterValue): void {
  if (Array.isArray(tone)) {
    throw new Error("Multiple tones are not supported yet");
  }
  if (!(tone.includes("<") || tone.includes(">"))) {
    throw new Error("Tone must contain either greater than or less than");
  }
  if (tone.includes("=")) {
    throw new Error("Tone cannot contain '='");
  }
}
