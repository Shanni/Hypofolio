/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#A0522D'; // Rich brown from swatch
const tintColorDark = '#F5F0E8'; // Light beige from swatch

export const Colors = {
  light: {
    text: '#3D2914', // Dark brown text
    background: '#F5F0E8', // Light beige background from swatch
    tint: tintColorLight,
    icon: '#A0522D', // Rich brown icon color
    tabIconDefault: '#8B7355', // Muted brown for inactive tabs
    tabIconSelected: tintColorLight, // Rich brown for active tabs
  },
  dark: {
    text: '#F5F0E8', // Light beige text from swatch
    background: '#3D2914', // Dark brown background
    tint: tintColorDark,
    icon: '#F5F0E8', // Light beige icons
    tabIconDefault: '#D4C4B0', // Muted beige for inactive tabs
    tabIconSelected: tintColorDark, // Light beige for active tabs
  },
};
