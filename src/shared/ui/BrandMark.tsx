import React from "react";
import { Image, type StyleProp, type ImageStyle } from "react-native";

const BADGE = require("../../../assets/logo.png");
const MARK = require("../../../assets/mark.png");

interface Props {
  size: number;
  /** "badge" is the full round logo with its lettering; "mark" is its AA centre, for small places. */
  variant?: "badge" | "mark";
  style?: StyleProp<ImageStyle>;
}

/**
 * The academy's logo. Below about 64 px the badge's curved lettering cannot be
 * read, so headers and the menu use the AA mark and larger places the badge.
 */
export function BrandMark({ size, variant = "mark", style }: Props) {
  return (
    <Image
      source={variant === "badge" ? BADGE : MARK}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Akbar's Academy"
      accessibilityRole="image"
    />
  );
}
