export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export const formatPhoneNumber = (input?: string): string => {
  if (!input) {
    return "";
  }

  input = input.replace(/\D/g, "").substring(0, 10);

  const size = input.length;
  if (size === 0) {
    return input;
  }

  if (size < 4) {
    input = `(${input}`;
  } else if (size < 7) {
    input = `(${input.substring(0, 3)}) ${input.substring(3, 6)}`;
  } else {
    input = `(${input.substring(0, 3)}) ${input.substring(
      3,
      6
    )}-${input.substring(6, 10)}`;
  }

  return input;
};

export const cleanPhoneNumber = (input?: string): string => {
  return input ? input.replace(/\D/g, "") : "";
};
