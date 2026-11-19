// TEMPORARY: the step-bar variants, shared by the server page and the picker.
export const STEP_VARIANTS = [
  { id: "trail", label: "Trail" },
  { id: "tower", label: "Tower" },
  { id: "channel", label: "Channel" },
] as const;
export type StepVariant = (typeof STEP_VARIANTS)[number]["id"];
