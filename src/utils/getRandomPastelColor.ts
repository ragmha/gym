export const getRandomPastelColor = () => {
  const hue = Math.floor(Math.random() * 360);
  const pastel = "hsl(" + hue + ", 50%, 87.5%)";
  return pastel;
};
