import React from "react";
import { Image, type StyleProp, type ImageStyle } from "react-native";

const BADGE = require("../../../assets/logo.png");

interface Props {
  /** Width and height in px: the badge is round, so it is always drawn square. */
  size: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * The academy's complete round badge, never cropped and never stretched:
 * the picture is square, drawn in a square box, and `contain` keeps all of it
 * inside whatever box it is given. Pick `size` for the place: about 40–48 in
 * a header or menu, over 100 on the sign-in screen.
 */
export function BrandMark({ size, style }: Props) {
  return (
    <Image
      source={BADGE}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Akbar's Academy"
      accessibilityRole="image"
    />
  );
}
