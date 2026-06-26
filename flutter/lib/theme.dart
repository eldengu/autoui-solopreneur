import 'package:flutter/material.dart';

/// Color tokens mirroring the web Tailwind/shadcn theme so the Flutter render
/// of a panel spec looks like the Next.js version.
class AppColors {
  static const background = Color(0xFFFAFAFA);
  static const card = Color(0xFFFFFFFF);
  static const foreground = Color(0xFF0A0A0A);
  static const mutedForeground = Color(0xFF71717A); // zinc-500
  static const border = Color(0xFFE4E4E7); // zinc-200
  static const muted = Color(0xFFF4F4F5); // zinc-100
  static const primary = Color(0xFF6366F1); // indigo-500

  // Tone fills (for bars/progress) and text colors.
  static const Map<String, Color> toneFill = {
    'neutral': Color(0xFFA1A1AA),
    'positive': Color(0xFF10B981),
    'warning': Color(0xFFF59E0B),
    'danger': Color(0xFFF43F5E),
    'info': Color(0xFF0EA5E9),
  };

  static const Map<String, Color> toneText = {
    'neutral': Color(0xFF52525B),
    'positive': Color(0xFF059669),
    'warning': Color(0xFFD97706),
    'danger': Color(0xFFE11D48),
    'info': Color(0xFF0284C7),
  };

  static const Map<String, Color> toneBadgeBg = {
    'neutral': Color(0xFFF4F4F5),
    'positive': Color(0xFFD1FAE5),
    'warning': Color(0xFFFEF3C7),
    'danger': Color(0xFFFFE4E6),
    'info': Color(0xFFE0F2FE),
  };

  static const Map<String, Color> toneBadgeText = {
    'neutral': Color(0xFF3F3F46),
    'positive': Color(0xFF047857),
    'warning': Color(0xFFB45309),
    'danger': Color(0xFFBE123C),
    'info': Color(0xFF0369A1),
  };
}

Color? hexColor(String? hex) {
  if (hex == null) return null;
  var h = hex.replaceFirst('#', '').trim();
  if (h.length == 6) h = 'FF$h';
  final v = int.tryParse(h, radix: 16);
  return v == null ? null : Color(v);
}

ThemeData buildTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      surface: AppColors.background,
    ),
    fontFamily: 'Roboto',
  );
}
