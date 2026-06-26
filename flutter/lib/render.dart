import 'package:flutter/material.dart';

import 'theme.dart';

/// Recursive renderer for the json-render spec format:
/// `{ root: string, elements: { key: { type, props, children? } } }`.
/// Mirrors the web finance-registry primitives 1:1.
class SpecRenderer extends StatelessWidget {
  final Map<String, dynamic> spec;
  const SpecRenderer({super.key, required this.spec});

  @override
  Widget build(BuildContext context) {
    final root = spec['root'] as String?;
    final elements =
        (spec['elements'] as Map?)?.cast<String, dynamic>() ?? const {};
    if (root == null || elements[root] == null) {
      return const SizedBox.shrink();
    }
    return renderElement(root, elements);
  }
}

// ---- helpers ---------------------------------------------------------------

String? _s(Map p, String k) => p[k] is String ? p[k] as String : null;
bool _b(Map p, String k) => p[k] == true;
num? _n(Map p, String k) => p[k] is num ? p[k] as num : null;

String commas(num n) {
  final isInt = n == n.roundToDouble();
  final s = isInt ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
  final parts = s.split('.');
  var intPart = parts[0];
  final neg = intPart.startsWith('-');
  if (neg) intPart = intPart.substring(1);
  final buf = StringBuffer();
  for (var i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 == 0) buf.write(',');
    buf.write(intPart[i]);
  }
  return '${neg ? '-' : ''}$buf${parts.length > 1 ? '.${parts[1]}' : ''}';
}

double _gap(String? g) => g == 'sm' ? 8 : (g == 'lg' ? 24 : 16);

// ---- dispatch --------------------------------------------------------------

Widget renderElement(String key, Map<String, dynamic> elements) {
  final el = (elements[key] as Map?)?.cast<String, dynamic>();
  if (el == null) return const SizedBox.shrink();
  final type = el['type'] as String? ?? '';
  final props = (el['props'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
  final childKeys =
      (el['children'] as List?)?.whereType<String>().toList() ?? const <String>[];
  List<Widget> children() =>
      childKeys.map((k) => renderElement(k, elements)).toList();

  switch (type) {
    case 'Card':
      return _card(props, children());
    case 'Stack':
      return _stack(props, children());
    case 'Grid':
      return _grid(props, children());
    case 'Metric':
      return _metric(props);
    case 'Badge':
      return _badge(props);
    case 'Text':
      return _text(props);
    case 'BarGraph':
      return _barGraph(props);
    case 'LineGraph':
      return _lineGraph(props);
    case 'ProgressBar':
      return _progressBar(props);
    case 'ListItem':
      return _listItem(props);
    default:
      return const SizedBox.shrink();
  }
}

// ---- primitives ------------------------------------------------------------

Widget _card(Map props, List<Widget> children) {
  final title = _s(props, 'title');
  final subtitle = _s(props, 'subtitle');
  final accent = hexColor(_s(props, 'accent'));
  return Container(
    decoration: BoxDecoration(
      color: AppColors.card,
      borderRadius: BorderRadius.circular(12),
      border: Border(
        top: BorderSide(color: accent ?? AppColors.border, width: accent != null ? 3 : 1),
        left: const BorderSide(color: AppColors.border),
        right: const BorderSide(color: AppColors.border),
        bottom: const BorderSide(color: AppColors.border),
      ),
      boxShadow: const [
        BoxShadow(color: Color(0x0F000000), blurRadius: 10, offset: Offset(0, 2)),
      ],
    ),
    padding: const EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (title != null || subtitle != null) ...[
          if (title != null)
            Text(title,
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.foreground)),
          if (subtitle != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(subtitle,
                  style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
            ),
          const SizedBox(height: 16),
        ],
        ...children,
      ],
    ),
  );
}

Widget _stack(Map props, List<Widget> children) {
  final row = _s(props, 'direction') == 'row';
  final gap = _gap(_s(props, 'gap'));
  final spaced = <Widget>[];
  for (var i = 0; i < children.length; i++) {
    if (i > 0) spaced.add(SizedBox(width: row ? gap : 0, height: row ? 0 : gap));
    spaced.add(row ? children[i] : children[i]);
  }
  return row
      ? Row(crossAxisAlignment: CrossAxisAlignment.center, children: spaced)
      : Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: spaced);
}

Widget _grid(Map props, List<Widget> children) {
  final columns = (_n(props, 'columns') ?? 2).toInt().clamp(1, 6);
  final gap = _gap(_s(props, 'gap'));
  return LayoutBuilder(builder: (context, c) {
    final w = (c.maxWidth - gap * (columns - 1)) / columns;
    return Wrap(
      spacing: gap,
      runSpacing: gap,
      children:
          children.map((ch) => SizedBox(width: w > 0 ? w : c.maxWidth, child: ch)).toList(),
    );
  });
}

Widget _metric(Map props) {
  final label = _s(props, 'label') ?? '';
  final value = _s(props, 'value') ?? '';
  final delta = _s(props, 'delta');
  final hint = _s(props, 'hint');
  final trend = _s(props, 'trend');
  final trendColor = trend == 'up'
      ? AppColors.toneText['positive']!
      : trend == 'down'
          ? AppColors.toneText['danger']!
          : AppColors.mutedForeground;
  final glyph = trend == 'up' ? '▲' : (trend == 'down' ? '▼' : '→');
  return Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.muted.withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label.toUpperCase(),
            style: const TextStyle(
                fontSize: 11, letterSpacing: 0.5, color: AppColors.mutedForeground)),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(
                fontSize: 24, fontWeight: FontWeight.w600, color: AppColors.foreground)),
        if (delta != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text('$glyph $delta', style: TextStyle(fontSize: 13, color: trendColor)),
          ),
        if (hint != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(hint,
                style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
          ),
      ],
    ),
  );
}

Widget _badge(Map props) {
  final label = _s(props, 'label') ?? '';
  final tone = _s(props, 'tone') ?? 'neutral';
  return Align(
    alignment: Alignment.centerLeft,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.toneBadgeBg[tone] ?? AppColors.muted,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.toneBadgeText[tone] ?? AppColors.foreground)),
    ),
  );
}

Widget _text(Map props) {
  final content = _s(props, 'content') ?? '';
  final muted = _b(props, 'muted');
  final size = _s(props, 'size');
  final weight = _s(props, 'weight');
  return Text(content,
      style: TextStyle(
        fontSize: size == 'lg' ? 18 : (size == 'sm' ? 13 : 14),
        fontWeight: weight == 'bold'
            ? FontWeight.w700
            : (weight == 'medium' ? FontWeight.w500 : FontWeight.w400),
        color: muted ? AppColors.mutedForeground : AppColors.foreground,
      ));
}

Widget _barGraph(Map props) {
  final data = (props['data'] as List?)?.whereType<Map>().toList() ?? const [];
  final unit = _s(props, 'unit') ?? '';
  final values = data.map((d) => (d['value'] as num?)?.toDouble() ?? 0).toList();
  final maxProp = _n(props, 'max')?.toDouble();
  final maxV = maxProp ?? (values.isEmpty ? 1 : values.reduce((a, b) => a > b ? a : b));
  final denom = maxV <= 0 ? 1.0 : maxV;
  return Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      for (var i = 0; i < data.length; i++) ...[
        if (i > 0) const SizedBox(height: 8),
        Row(
          children: [
            SizedBox(
              width: 96,
              child: Text(data[i]['label']?.toString() ?? '',
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  height: 10,
                  color: AppColors.muted,
                  alignment: Alignment.centerLeft,
                  child: FractionallySizedBox(
                    widthFactor: (values[i] / denom).clamp(0.0, 1.0),
                    child: Container(
                      decoration: BoxDecoration(
                        color: hexColor(data[i]['color']?.toString()) ?? AppColors.primary,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 80,
              child: Text('$unit${commas(values[i])}',
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontSize: 12, color: AppColors.foreground)),
            ),
          ],
        ),
      ],
    ],
  );
}

Widget _lineGraph(Map props) {
  final points =
      (props['points'] as List?)?.map((e) => (e as num).toDouble()).toList() ?? const [];
  final labels = (props['labels'] as List?)?.map((e) => e.toString()).toList();
  final color = hexColor(_s(props, 'color')) ?? AppColors.primary;
  return Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SizedBox(height: 64, child: CustomPaint(painter: _LinePainter(points, color))),
      if (labels != null) ...[
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: labels
              .map((l) => Text(l,
                  style: const TextStyle(fontSize: 10, color: AppColors.mutedForeground)))
              .toList(),
        ),
      ],
    ],
  );
}

class _LinePainter extends CustomPainter {
  final List<double> points;
  final Color color;
  _LinePainter(this.points, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;
    const pad = 4.0;
    final minV = points.reduce((a, b) => a < b ? a : b);
    final maxV = points.reduce((a, b) => a > b ? a : b);
    final range = (maxV - minV) == 0 ? 1 : (maxV - minV);
    final coords = <Offset>[];
    for (var i = 0; i < points.length; i++) {
      final x = pad + (i / (points.length - 1)) * (size.width - pad * 2);
      final y = size.height - pad - ((points[i] - minV) / range) * (size.height - pad * 2);
      coords.add(Offset(x, y));
    }
    final line = Path()..moveTo(coords.first.dx, coords.first.dy);
    for (final c in coords.skip(1)) {
      line.lineTo(c.dx, c.dy);
    }
    final area = Path.from(line)
      ..lineTo(size.width - pad, size.height - pad)
      ..lineTo(pad, size.height - pad)
      ..close();
    canvas.drawPath(area, Paint()..color = color.withValues(alpha: 0.12));
    canvas.drawPath(
      line,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _LinePainter old) =>
      old.points != points || old.color != color;
}

Widget _progressBar(Map props) {
  final value = _n(props, 'value')?.toDouble() ?? 0;
  final max = _n(props, 'max')?.toDouble() ?? 1;
  final label = _s(props, 'label');
  final tone = _s(props, 'tone') ?? 'info';
  final pct = (max <= 0 ? 0.0 : (value / max)).clamp(0.0, 1.0);
  return Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (label != null) ...[
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
            Text('${(pct * 100).round()}%',
                style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
          ],
        ),
        const SizedBox(height: 4),
      ],
      ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: Container(
          height: 10,
          color: AppColors.muted,
          alignment: Alignment.centerLeft,
          child: FractionallySizedBox(
            widthFactor: pct,
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.toneFill[tone] ?? AppColors.primary,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

Widget _listItem(Map props) {
  final primary = _s(props, 'primary') ?? '';
  final secondary = _s(props, 'secondary');
  final badge = _s(props, 'badge');
  final badgeTone = _s(props, 'badgeTone') ?? 'neutral';
  final done = _b(props, 'done');
  return Container(
    padding: const EdgeInsets.symmetric(vertical: 8),
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: AppColors.border)),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(primary,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    color: done ? AppColors.mutedForeground : AppColors.foreground,
                    decoration: done ? TextDecoration.lineThrough : null,
                  )),
              if (secondary != null)
                Text(secondary,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
            ],
          ),
        ),
        if (badge != null) ...[
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.toneBadgeBg[badgeTone] ?? AppColors.muted,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(badge,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppColors.toneBadgeText[badgeTone] ?? AppColors.foreground)),
          ),
        ],
      ],
    ),
  );
}
